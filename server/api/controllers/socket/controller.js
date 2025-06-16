import Joi from "joi";
import _ from "lodash";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from "dotenv";
dotenv.config();

// common function
import apiError from '../../../helper/apiError';
import response from '../../../../assets/response';
import responseMessage from "../../../../assets/responseMessage";
import commonFunction from '../../../helper/utils';
import exportSwagger from "../../../helper/exportSwagger";
import { apiLogHandler } from "../../../helper/apiLogHandler";

// enum 

// services import


export const handleConnection = async (socket, io) => {
    try {
        const userId = socket?.tokenData?.userId;
        console.log(`User connected: ${userId || 'unknown'}, Socket ID: ${socket.id}`);

        if (!userId) {
            socket.emit('error', { message: 'Authentication required' });
            return;
        }

        // Update user's socket ID in database
        const user = await userServices.find({ id: userId });
        if (user) {
            await userServices.update({ id: user.id }, { socketId: socket.id });

            // Broadcast to all rooms this user is part of that they're online
            let rooms = [];

            if (user.userType === 'DOCTOR') {
                // Get doctor's chat rooms
                rooms = await chatRoomServices.list({ doctorId: userId });

                // Notify patients this doctor is online
                rooms.forEach(room => {
                    if (room.patientId) {
                        const patient = userServices.find({ id: room.patientId });
                        if (patient && patient.socketId) {
                            io.to(patient.socketId).emit('participantStatus', {
                                roomId: room.id,
                                userId: userId,
                                status: 'online'
                            });
                        }
                    }
                });
            } else {
                // Get patient's chat rooms
                rooms = await chatRoomServices.list({ patientId: userId });

                // Notify doctors this patient is online
                rooms.forEach(room => {
                    if (room.doctorId) {
                        const doctor = userServices.find({ id: room.doctorId });
                        if (doctor && doctor.socketId) {
                            io.to(doctor.socketId).emit('participantStatus', {
                                roomId: room.id,
                                userId: userId,
                                status: 'online'
                            });
                        }
                    }
                });
            }

            // Join all chat room channels
            rooms.forEach(room => {
                socket.join(`room_${room.id}`);
                console.log(`User ${userId} joined room: room_${room.id}`);
            });
        }

        // Handle joining specific chat rooms
        socket.on('joinRoom', async ({ roomId }) => {
            try {
                if (!roomId) {
                    socket.emit('error', { message: 'Room ID is required' });
                    return;
                }

                // Check if room exists and user is a participant
                const room = await chatRoomServices.find({ id: roomId });
                if (!room) {
                    socket.emit('error', { message: 'Chat room not found' });
                    return;
                }

                if (room.doctorId !== userId && room.patientId !== userId) {
                    socket.emit('error', { message: 'You are not a participant in this room' });
                    return;
                }

                // Join the socket room
                socket.join(`room_${roomId}`);
                console.log(`User ${userId} joined room: room_${roomId}`);

                // Notify other participant
                const otherParticipantId = room.doctorId === userId ? room.patientId : room.doctorId;
                const otherParticipant = await userServices.find({ id: otherParticipantId });

                if (otherParticipant && otherParticipant.socketId) {
                    io.to(otherParticipant.socketId).emit('participantJoined', {
                        roomId: roomId,
                        userId: userId
                    });
                }

                socket.emit('roomJoined', { roomId });
            } catch (error) {
                console.error("Error in joinRoom:", error);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });

        // Handle typing indicators
        socket.on('typing', ({ roomId }) => {
            if (!roomId) return;

            socket.to(`room_${roomId}`).emit('typing', {
                roomId,
                userId
            });
        });

        socket.on('stopTyping', ({ roomId }) => {
            if (!roomId) return;

            socket.to(`room_${roomId}`).emit('stopTyping', {
                roomId,
                userId
            });
        });

        // Handle new message
        socket.on('sendMessage', async (data) => {
            try {
                const { roomId, content, attachmentUrl, messageType = 'TEXT' } = data;

                if (!roomId || !content) {
                    socket.emit('error', { message: 'Room ID and message content are required' });
                    return;
                }

                // Validate room and user participation
                const room = await chatRoomServices.find({ id: roomId });
                if (!room) {
                    socket.emit('error', { message: 'Chat room not found' });
                    return;
                }

                if (room.doctorId !== userId && room.patientId !== userId) {
                    socket.emit('error', { message: 'You are not a participant in this room' });
                    return;
                }

                if (room.status !== 'ACTIVE') {
                    socket.emit('error', { message: 'This chat room is no longer active' });
                    return;
                }

                // Create the message in database
                const newMessage = await chatMessageServices.create({
                    chatRoomId: roomId,
                    senderId: userId,
                    content,
                    messageType,
                    attachmentUrl,
                    isRead: 'false'
                });

                // Update room's last message time
                await chatRoomServices.update(
                    { id: roomId },
                    { lastMessageAt: new Date() }
                );

                // Get sender details
                const sender = await userServices.find({ id: userId });

                // Format message for broadcast
                const formattedMessage = {
                    ...newMessage,
                    sender: {
                        id: sender.id,
                        name: `${sender.firstName} ${sender.lastName}`,
                        userType: sender.userType
                    }
                };

                // Broadcast to room
                io.to(`room_${roomId}`).emit('newMessage', {
                    roomId,
                    message: formattedMessage
                });

                // Send notification to other participant if they're not online
                const otherParticipantId = room.doctorId === userId ? room.patientId : room.doctorId;
                const otherParticipant = await userServices.find({ id: otherParticipantId });

                if (otherParticipant && !otherParticipant.socketId) {
                    // They're offline, send a notification
                    await notificationServices.create({
                        userId: otherParticipantId,
                        title: 'New message',
                        message: `New message from ${sender.firstName} ${sender.lastName}`
                    });
                }

                // Acknowledge message receipt
                socket.emit('messageSent', {
                    success: true,
                    messageId: newMessage.id,
                    timestamp: newMessage.createdAt
                });
            } catch (error) {
                console.error("Error in sendMessage:", error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Handle read receipts
        socket.on('markAsRead', async ({ roomId }) => {
            try {
                if (!roomId) return;

                // Validate room and user participation
                const room = await chatRoomServices.find({ id: roomId });
                if (!room || (room.doctorId !== userId && room.patientId !== userId)) {
                    return;
                }

                // Determine the other participant
                const otherParticipantId = room.doctorId === userId ? room.patientId : room.doctorId;

                // Mark messages as read
                await chatMessageServices.updateMany(
                    {
                        chatRoomId: roomId,
                        senderId: otherParticipantId,
                        isRead: 'false'
                    },
                    {
                        isRead: 'true',
                        readAt: new Date()
                    }
                );

                // Notify the other participant their messages were read
                const otherParticipant = await userServices.find({ id: otherParticipantId });
                if (otherParticipant && otherParticipant.socketId) {
                    io.to(otherParticipant.socketId).emit('messagesRead', {
                        roomId,
                        byUserId: userId
                    });
                }
            } catch (error) {
                console.error("Error in markAsRead:", error);
            }
        });

        // Handle disconnect
        socket.on('disconnect', async () => {
            try {
                console.log(`User disconnected: ${userId}`);

                // Update user's socket ID in database
                await userServices.update({ id: userId }, { socketId: null });

                // Get user details to determine chat rooms
                const user = await userServices.find({ id: userId });
                let rooms = [];

                if (user) {
                    if (user.userType === 'DOCTOR') {
                        // Get doctor's chat rooms
                        rooms = await chatRoomServices.list({ doctorId: userId });
                    } else {
                        // Get patient's chat rooms
                        rooms = await chatRoomServices.list({ patientId: userId });
                    }

                    // Notify participants in each room that this user is offline
                    rooms.forEach(async (room) => {
                        const otherParticipantId = room.doctorId === userId ? room.patientId : room.doctorId;
                        const otherParticipant = await userServices.find({ id: otherParticipantId });

                        if (otherParticipant && otherParticipant.socketId) {
                            io.to(otherParticipant.socketId).emit('participantStatus', {
                                roomId: room.id,
                                userId: userId,
                                status: 'offline'
                            });
                        }
                    });
                }
            } catch (error) {
                console.error("Error handling disconnect:", error);
            }
        });

    } catch (error) {
        console.error("Error in handleConnection:", error);
    }
};
