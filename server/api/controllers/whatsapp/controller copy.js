import Joi from "joi";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';
import qrcode from "qrcode";
import fs from 'fs';       // Add this
import path from 'path';
import axios from 'axios'; // Add this


// common function
import apiError from '../../../helper/apiError';
import response from '../../../../assets/response';
import responseMessage from "../../../../assets/responseMessage";
import commonFunction from '../../../helper/utils';
import messageTemplate from "../../../helper/messageTemplate";
import { apiLogHandler } from "../../../helper/apiLogHandler";

// enum 
import status from "../../../enums/status";

// services import
import userServices from "../../services/user";
import apiCall, { getHeader } from "../../../helper/apiCall";


const userState = {};

export class userController {
    async whatsappMessage(req, res, next) {
        try {
            const msg = req.body.Body?.trim();
            const from = req.body.From;
            const requestBody = req.body;
            const mediaUrl = req.body.MediaUrl0;
            const contentType = req.body.MediaContentType0;


            let twiml = new (require('twilio').twiml.MessagingResponse)();

            console.log("Requested message: ===>", msg);
            console.log("From: ===>", from);

            // Initialize user state if not present
            if (!userState[from]) {
                userState[from] = { step: 0, data: {} };
            }

            const user = await userServices.find({ phone: from });

            // Handle user flow
            if (userState[from].step === 0) {
                twiml.message(
                    `👋 Welcome to BB Corp. Please choose your language:\n\u200E🇬🇧 English\n\u200E🇸🇦 العربية`
                );
                userState[from].step = 1;
            } else if (userState[from].step === 1) {
                if (msg.toLowerCase() === 'english') {
                    twiml.message(
                        // `Please choose an option to continue:\n🔐 Login - If you already have an account\n📝 Signup - If you're new here\n📋 KYC\n💵 Deposit\n💰 Get Accounts\n🧪 Create Demo Account\n🏦 Create Real Account`
                        `Please choose an option to continue:\n🔐 Login - If you already have an account\n📝 Signup - If you're new here\n📋 KYC - If \n💵 Deposit\n💰 Accounts`
                    );
                    userState[from].step = 2;
                } else {
                    twiml.message(`❌ Sorry, only English is supported at the moment.`);
                }

                // Signup Process
            } else if (msg.toLowerCase() === 'signup') {
                twiml.message(`Let's start! Please share your first name only (1/6)`);
                userState[from].step = 3;
            } else if (userState[from].step === 3) {
                userState[from].data.firstName = msg;
                twiml.message(`Please share your last name only (2/6)`);
                userState[from].step = 4;
            } else if (userState[from].step === 4) {
                userState[from].data.lastName = msg;
                twiml.message(`Now I will need your email address (3/6)`);
                userState[from].step = 5;
            } else if (userState[from].step === 5) {
                userState[from].data.email = msg;
                twiml.message(`Now please share your phone number (4/6)`);
                userState[from].step = 6;
            } else if (userState[from].step === 6) {
                userState[from].data.phone = msg;
                twiml.message(
                    `Finally, please create a password that includes at least 6 characters, 1 special character, and 1 uppercase letter (5/6)`
                );
                userState[from].step = 7;
            } else if (userState[from].step === 7) {
                const password = msg;
                if (!/^(?=.*[A-Z])(?=.*[!@#$&*])(?=.*[0-9]).{6,}$/.test(password)) {
                    twiml.message(
                        `❗ Your password is too weak. Please create a stronger password with at least 6 characters, 1 special character, and 1 uppercase letter.`
                    );
                } else {
                    userState[from].data.password = password;
                    twiml.message(`Excellent! Please reconfirm your password (6/6)`);
                    userState[from].step = 8;
                }
            } else if (userState[from].step === 8) {
                if (msg !== userState[from].data.password) {
                    twiml.message(
                        `❌ Passwords do not match. Please input the same password you provided before.`
                    );
                } else {
                    twiml.message(
                        `Thank you for your information,\nBelow is your information:\nFirst Name: ${userState[from].data.firstName}\nLast Name: ${userState[from].data.lastName}\nEmail: ${userState[from].data.email}\nPhone number: ${userState[from].data.phone}\nPassword: ${userState[from].data.password}\n\nIf you would like to proceed, type "CONFIRM". To restart, type "RESTART".`
                    );
                    userState[from].step = 9;
                }
            } else if (userState[from].step === 9) {
                if (msg.toLowerCase() === 'confirm') {
                    try {
                        const hashedPassword = await bcrypt.hash(userState[from].data.password, 10);
                        await userServices.create({
                            phone: userState[from].data.phone,
                            firstName: userState[from].data.firstName,
                            lastName: userState[from].data.lastName,
                            email: userState[from].data.email,
                            password: hashedPassword,
                        });

                        const apiReq = {
                            name: `${userState[from].data.firstName} ${userState[from].data.lastName}`,
                            email: userState[from].data.email,
                            password: userState[from].data.password,
                            phoneNumber: userState[from].data.phone,
                        };

                        await apiCall(
                            "post",
                            "/api/client/auth/signup/partner/undefined",
                            null,
                            apiReq,
                            await getHeader()
                        );

                        twiml.message(
                            `✅ Thank you for joining BB Corp’s Whatsapp Trading Portal! Please verify your account with the link sent to your email.`
                        );
                        userState[from] = { step: 0, data: {} }; // Reset state
                    } catch (error) {
                        console.error("Error during signup:", error);
                        twiml.message(`❌ Signup failed. Please try again later.`);
                    }
                } else if (msg.toLowerCase() === 'restart') {
                    twiml.message(`🔄 Restarting the signup process. Let's start again!`);
                    userState[from] = { step: 0, data: {} }; // Reset state
                } else {
                    twiml.message(
                        `❌ Invalid option. Please type "CONFIRM" to proceed or "RESTART" to start over.`
                    );
                }

                //----- Login Process -------------------------------------------
            } else if (msg.toLowerCase() === 'login') {
                twiml.message(`🔐 Please provide your registered email address.`);
                userState[from].step = 'login-email';
            } else if (userState[from].step === 'login-email') {
                const email = msg.trim();
                userState[from].data.email = email;
                twiml.message(`✅ Email received! Now, please provide your password.`);
                userState[from].step = 'login-password';
            } else if (userState[from].step === 'login-password') {
                const password = msg.trim();
                const email = userState[from].data.email;

                try {
                    // Call third-party API for authentication
                    twiml.message(`✅ Login successful! Welcome back, ${email} -- ${password}.`);
                    userState[from] = { step: 0, data: {} }; // Reset state
                } catch (error) {
                    console.error('Error during login:', error);
                    twiml.message(`❌ An error occurred while logging in. Please try again later.`);
                }

                // KYC Process
            } else if (msg.toLowerCase() === 'kyc') {
                twiml.message(`📋 Let's start your KYC process! Please provide your full name (1/5).`);
                userState[from].step = 'kyc-name';
            } else if (userState[from].step === 'kyc-name') {
                userState[from].data.fullName = msg.trim();
                twiml.message(`Please provide your date of birth in the format YYYY-MM-DD (2/5).`);
                userState[from].step = 'kyc-dob';
            } else if (userState[from].step === 'kyc-dob') {
                userState[from].data.dob = msg.trim();
                twiml.message(`Please provide your government-issued ID number (3/5).`);
                userState[from].step = 'kyc-id';
            } else if (userState[from].step === 'kyc-id') {
                userState[from].data.idNumber = msg.trim();
                twiml.message(`Please upload your documents for verification (4/5). Type "UPLOAD" to start uploading.`);
                userState[from].step = 'kyc-upload';
            } else if (userState[from].step === 'kyc-upload') {
                if (msg.toLowerCase() === 'upload') {
                    twiml.message(`Please upload your first document (e.g., ID proof).`);
                    userState[from].step = 'kyc-upload-doc1';
                } else {
                    twiml.message(`❌ Invalid option. Type "UPLOAD" to start uploading your documents.`);
                }
            } else if (userState[from].step === 'kyc-upload-doc1') {
                const numMedia = parseInt(req.body.NumMedia || 0);

                if (numMedia > 0) {
                    userState[from].data.documents = userState[from].data.documents || [];
                    const mediaUrl = req.body.MediaUrl0;
                    const contentType = req.body.MediaContentType0;
                    const fileName = `id_proof_${from.replace('whatsapp:', '')}.${await getFileExtension(contentType)}`;

                    try {
                        // Download the file
                        const filePath = await downloadMediaFile(mediaUrl, fileName);

                        userState[from].data.documents.push({
                            type: 'ID Proof',
                            contentType: contentType,
                            remoteUrl: mediaUrl,
                            localPath: filePath
                        });

                        twiml.message(`✅ Document received and saved! Please upload your second document (e.g., Address proof).`);
                        userState[from].step = 'kyc-upload-doc2';
                    } catch (error) {
                        console.error('Error handling document upload:', error);
                        twiml.message(`❌ Error processing your document. Please try again.`);
                    }
                } else {
                    twiml.message(`❌ No file detected. Please send your ID proof as an attachment.`);
                }
            } else if (userState[from].step === 'kyc-upload-doc2') {
                const numMedia = parseInt(req.body.NumMedia || 0);

                if (numMedia > 0) {
                    const mediaUrl = req.body.MediaUrl0;
                    const contentType = req.body.MediaContentType0;
                    const fileName = `address_proof_${from.replace('whatsapp:', '')}.${await getFileExtension(contentType)}`;

                    try {
                        // Download the file
                        const filePath = await downloadMediaFile(mediaUrl, fileName);

                        userState[from].data.documents.push({
                            type: 'Address Proof',
                            contentType: contentType,
                            remoteUrl: mediaUrl,
                            localPath: filePath
                        });

                        twiml.message(
                            `✅ All documents received and saved! Here is the summary:\n` +
                            `Full Name: ${userState[from].data.fullName}\n` +
                            `Date of Birth: ${userState[from].data.dob}\n` +
                            `ID Number: ${userState[from].data.idNumber}\n` +
                            `Documents:\n` +
                            `1. ${userState[from].data.documents[0].type} (${userState[from].data.documents[0].contentType}): Saved\n` +
                            `2. ${userState[from].data.documents[1].type} (${userState[from].data.documents[1].contentType}): Saved\n\n` +
                            `If you would like to proceed, type "CONFIRM". To restart, type "RESTART".`
                        );
                        userState[from].step = 'kyc-confirm';
                    } catch (error) {
                        console.error('Error handling document upload:', error);
                        twiml.message(`❌ Error processing your document. Please try again.`);
                    }
                } else {
                    twiml.message(`❌ No file detected. Please send your address proof as an attachment.`);
                }
            } else if (userState[from].step === 'kyc-confirm') {
                if (msg.toLowerCase() === 'confirm') {
                    try {
                        const kycData = {
                            fullName: userState[from].data.fullName,
                            dob: userState[from].data.dob,
                            idNumber: userState[from].data.idNumber,
                            documents: userState[from].data.documents,
                        };

                        // Send KYC data to third-party API

                        twiml.message(`✅ Your KYC details have been submitted successfully!`);
                        userState[from] = { step: 0, data: {} }; // Reset state
                    } catch (error) {
                        console.error("Error during KYC submission:", error);
                        twiml.message(`❌ KYC submission failed. Please try again later.`);
                    }
                } else if (msg.toLowerCase() === 'restart') {
                    twiml.message(`🔄 Restarting the KYC process. Let's start again!`);
                    userState[from] = { step: 'kyc', data: {} }; // Reset state
                } else {
                    twiml.message(
                        `❌ Invalid option. Please type "CONFIRM" to proceed or "RESTART" to start over.`
                    );
                }
            } else if (userState[from].step === 'deposit') {
                twiml.message(`💸 Choose your deposit method:\n Deposit via Crypto \n Deposit via Wish
                `);

            } else if (userState[from].step === 'accounts') {
                twiml.message(`📂 Account Options:\n 🧪 Create Demo Account\n🏦 Create Real Account \n 🧪 Get Demo Account\n🏦 Get Real Account`);


            } else if (userState[from].step === 'get demo account') {

                twiml.message(`💰 Your current balance is $1000.`);

            } else if (userState[from].step === 'get real account') {

                twiml.message(`💰 Your current balance is $1000.`);

            } else if (userState[from].step === 'create demo account') {

                twiml.message(`🧪 Demo account created successfully!`);

            } else if (userState[from].step === 'create real account') {

                twiml.message(`🏦 Real account created successfully!`);

            } else {
                twiml.message(`❓ Sorry, I didn't understand that. Please type "Hi" to get started.`);
            }

            res.writeHead(200, { 'Content-Type': 'text/xml' });
            return res.end(twiml.toString());
        } catch (error) {
            console.error("Error in whatsappMessage:", error);
            return next(error);
        }
    }
}

export default new userController();









async function downloadMediaFile(mediaUrl, fileName) {
    try {
        // Create uploads directory if it doesn't exist
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Generate a unique filename with timestamp
        const timestamp = new Date().getTime();
        const fileExtension = await getFileExtension(fileName);
        const filePath = path.join(uploadDir, `${timestamp}_${fileName}`);

        // Download the file
        const response = await axios({
            method: 'GET',
            url: mediaUrl,
            responseType: 'stream',
            auth: {
                username: process.env.TWILIO_ACCOUNT_SID,
                password: process.env.TWILIO_AUTH_TOKEN
            }
        });

        // Create a write stream and save the file
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(filePath));
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Error downloading media:', error);
        throw error;
    }
}

// Helper function to get file extension from content type
async function getFileExtension(contentType) {
    const types = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'application/pdf': 'pdf',
        'text/plain': 'txt',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
    };

    return types[contentType] || 'dat'; // Default extension if type is unknown
}







// import Joi from "joi";
// import _ from "lodash";
// import jwt from 'jsonwebtoken';
// import bcrypt from 'bcrypt';
// import speakeasy from 'speakeasy';
// import qrcode from "qrcode";

// // common function
// import apiError from '../../../helper/apiError';
// import response from '../../../../assets/response';
// import responseMessage from "../../../../assets/responseMessage";
// import commonFunction from '../../../helper/utils';
// import messageTemplate from "../../../helper/messageTemplate";
// import { apiLogHandler } from "../../../helper/apiLogHandler";

// // enum
// import status from "../../../enums/status";

// // services import
// import userServices from "../../services/user";
// import apiCall, { getHeader } from "../../../helper/apiCall";


// const userState = {};

// export class userController {
//     async whatsappMessage(req, res, next) {
//         try {
//             const msg = req.body.Body?.trim();
//             const from = req.body.From;

//             let twiml = new (require('twilio').twiml.MessagingResponse)();

//             console.log("Requested message: ===>", msg);
//             console.log("From: ===>", from);

//             // Initialize user state if not present
//             if (!userState[from]) {
//                 userState[from] = { step: 0, data: {} };
//             }

//             const user = await userServices.find({ phone: from });

//             // Handle user flow
//             if (userState[from].step === 0) {
//                 twiml.message(
//                     `👋 Welcome to BB Corp. Please choose your language:\n\u200E🇬🇧 English\n\u200E🇸🇦 العربية`
//                 );
//                 userState[from].step = 1;
//             } else if (userState[from].step === 1) {
//                 if (msg.toLowerCase() === 'english') {
//                     twiml.message(
//                         `Please choose an option to continue:\n🔐 Login - If you already have an account\n Create Account - If you're new here`
//                     );
//                     userState[from].step = 2;
//                 } else {
//                     twiml.message(`❌ Sorry, only English is supported at the moment.`);
//                 }
//             } else if (userState[from].step === 2) {
//                 if (msg.toLowerCase() === 'create account') {
//                     twiml.message(`Let's start! Please share your first name only (1/6)`);
//                     userState[from].step = 3;
//                 } else if (msg.toLowerCase() === 'login') {
//                     twiml.message(`🔐 Please provide your registered phone number to login.`);
//                     userState[from].step = 'login';
//                 } else {
//                     twiml.message(`❌ Invalid option. Please type "Login" or "Create Account".`);
//                 }
//             } else if (userState[from].step === 3) {
//                 userState[from].data.firstName = msg;
//                 twiml.message(`Please share your last name only (2/6)`);
//                 userState[from].step = 4;
//             } else if (userState[from].step === 4) {
//                 userState[from].data.lastName = msg;
//                 twiml.message(`Now I will need your email address (3/6)`);
//                 userState[from].step = 5;
//             } else if (userState[from].step === 5) {
//                 userState[from].data.email = msg;
//                 twiml.message(`Now please share your phone number (4/6)`);
//                 userState[from].step = 6;
//             } else if (userState[from].step === 6) {
//                 userState[from].data.phone = msg;
//                 twiml.message(
//                     `Finally, please create a password that includes at least 6 characters, 1 special character, and 1 uppercase letter (5/6)`
//                 );
//                 userState[from].step = 7;
//             } else if (userState[from].step === 7) {
//                 const password = msg;
//                 if (!/^(?=.*[A-Z])(?=.*[!@#$&*])(?=.*[0-9]).{6,}$/.test(password)) {
//                     twiml.message(
//                         `❗ Your password is too weak. Please create a stronger password with at least 6 characters, 1 special character, and 1 uppercase letter.`
//                     );
//                 } else {
//                     userState[from].data.password = password;
//                     twiml.message(`Excellent! Please reconfirm your password (6/6)`);
//                     userState[from].step = 8;
//                 }
//             } else if (userState[from].step === 8) {
//                 if (msg !== userState[from].data.password) {
//                     twiml.message(
//                         `❌ Passwords do not match. Please input the same password you provided before.`
//                     );
//                 } else {
//                     twiml.message(
//                         `Thank you for your information,\nBelow is your information:\nFirst Name: ${userState[from].data.firstName}\nLast Name: ${userState[from].data.lastName}\nEmail: ${userState[from].data.email}\nPhone number: ${userState[from].data.phone}\nPassword: ${userState[from].data.password}\n\nIf you would like to proceed, type "CONFIRM". To restart, type "RESTART".`
//                     );
//                     userState[from].step = 9;
//                 }
//             } else if (userState[from].step === 9) {
//                 if (msg.toLowerCase() === 'confirm') {
//                     try {
//                         await userServices.create({
//                             phone: userState[from].data.phone,
//                             firstName: userState[from].data.firstName,
//                             lastName: userState[from].data.lastName,
//                             email: userState[from].data.email,
//                             password: userState[from].data.password,
//                         });

//                         const apiReq = {
//                             "name": userState[from].data.firstName + " " + userState[from].data.lastName,
//                             "email": userState[from].data.email,
//                             "password": userState[from].data.password,
//                             "phoneNumber": userState[from].data.phone,
//                         }

//                         apiCall(
//                             "post",
//                             "/api/client/auth/signup/partner/undefined",
//                             null,
//                             apiReq,
//                             await getHeader()
//                         );

//                         twiml.message(
//                             `✅ Thank you for joining BB Corp’s Whatsapp Trading Portal! Please verify your account with the link sent to your email.`
//                         );
//                         userState[from] = { step: 0, data: {} }; // Reset state
//                     } catch (error) {
//                         console.error("Error during signup:", error);
//                         twiml.message(`❌ Signup failed. Please try again later.`);
//                     }
//                 } else if (msg.toLowerCase() === 'restart') {
//                     twiml.message(`🔄 Restarting the signup process. Let's start again!`);
//                     userState[from] = { step: 0, data: {} }; // Reset state
//                 } else {
//                     twiml.message(
//                         `❌ Invalid option. Please type "CONFIRM" to proceed or "RESTART" to start over.`
//                     );
//                 }
//             } else if (userState[from].step === 'login') {

//                 // Handle login logic here
//                 twiml.message(`🔐 Login functionality is not implemented yet.`);
//             } else {
//                 twiml.message(`❓ Sorry, I didn't understand that. Please type "Hi" to get started.`);
//             }

//             res.writeHead(200, { 'Content-Type': 'text/xml' });
//             return res.end(twiml.toString());
//         } catch (error) {
//             console.error("Error in whatsappMessage:", error);
//             return next(error);
//         }
//     }
// }

// export default new userController();

// // export class userController {


// //     async whatsappMessage(req, res, next) {
// //         try {
// //             const msg = req.body.Body?.trim().toLowerCase() || '';
// //             const from = req.body.From;
// //             let twiml = new (require('twilio').twiml.MessagingResponse)();

// //             console.log("Requested message: ===>", msg);
// //             console.log("From: ===>", from);
// //             console.log("req.body: ====>", req.body);

// //             const checkUser = await userServices.find({ phone: from });

// //             if (msg.startsWith('hii') || msg.startsWith('hello')) {
// //                 if (checkUser) {
// //                     const { firstName, lastName } = checkUser;
// //                     twiml.message(
// //                         `👋 Hello ${firstName} ${lastName}!\n\nHere are our Recommended Services:\n- 💰 My Account Balance\n- 💳 Credit Card Limit\n- 🚀 Get Instant Loan\n\nOther Services:\nTap below to explore all services:\n- 🌐 ALL Services`
// //                     );
// //                 } else {
// //                     twiml.message(
// //                         `❌ Sorry, we don't have any information about your account.\n\n\n📝 Signup Process:\nPlease provide the following details in this format:\nSignup <First Name>, <Last Name>, <Email>, <Password>`
// //                     );
// //                 }
// //                 res.writeHead(200, { 'Content-Type': 'text/xml' });
// //                 return res.end(twiml.toString());
// //             }

// //             if (msg.toLowerCase() == 'signup') {
// //                 twiml.message(
// //                     `📝 Signup Process:\nPlease provide the following details in this format:\nSignup <First Name>, <Last Name>, <Email>, <Password>`
// //                 );
// //                 res.writeHead(200, { 'Content-Type': 'text/xml' });
// //                 return res.end(twiml.toString());
// //             }

// //             if (msg.startsWith('signup ')) {
// //                 const details = msg.replace('signup ', '').split(',');
// //                 console.log("Details: ===>", details);

// //                 if (details.length !== 4) {
// //                     twiml.message('❌ Invalid format. Please provide details as:\nSignup <First Name>, <Last Name>, <Email>, <Password>');
// //                     res.writeHead(200, { 'Content-Type': 'text/xml' });
// //                     return res.end(twiml.toString());
// //                 }

// //                 const [firstName, lastName, email, password] = details.map((d) => d.trim());

// //                 const hashedPassword = await bcrypt.hash(password, 10);

// //                 await userServices.create({
// //                     phone: from,
// //                     firstName,
// //                     lastName,
// //                     email,
// //                     password: hashedPassword,
// //                 });

// //                 twiml.message('✅ Signup successful!');
// //                 res.writeHead(200, { 'Content-Type': 'text/xml' });
// //                 return res.end(twiml.toString());
// //             }

// //             if (msg.startsWith('balance')) {


// //             }


// //             twiml.message(`❓ Sorry, I didn't understand that. Please type "hello" or "hii" to get started.`);
// //             res.writeHead(200, { 'Content-Type': 'text/xml' });
// //             res.end(twiml.toString());
// //         } catch (error) {
// //             return next(error);
// //         }
// //     }


// // }
// // export default new userController();




