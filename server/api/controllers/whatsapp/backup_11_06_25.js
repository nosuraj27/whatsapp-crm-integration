import Joi from "joi";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';
import qrcode from "qrcode";
import fs from 'fs';
import path from 'path';
import axios from 'axios';

import apiError from '../../../helper/apiError';
import response from '../../../../assets/response';
import responseMessage from "../../../../assets/responseMessage";
import commonFunction from '../../../helper/utils';
import messageTemplate from "../../../helper/messageTemplate";
import { apiLogHandler } from "../../../helper/apiLogHandler";
import status from "../../../enums/status";
import userServices from "../../services/user";
import crmApiServices from "../../services/crmApi";
import twilioMessageServices from "../../services/twilioMessage";

const userState = {};

export class userController {
    async whatsappMessage(req, res, next) {
        try {
            const msg = req.body.Body?.trim();
            const from = req.body.From.replace('whatsapp:', '');
            const mediaUrl = req.body.MediaUrl0;
            const contentType = req.body.MediaContentType0;
            const buttonPayload = req.body.ButtonPayload;

            let twiml = new (require('twilio').twiml.MessagingResponse)();

            console.log(`Received message from ${from}: ${msg}`);

            // console.log(`Body: ${JSON.stringify(req.body, null, 2)}`);
            console.log(`buttonPayload: ${buttonPayload}`);

            // Initialize user state if not present
            if (msg.toLowerCase() === 'hii' || msg.toLowerCase() === 'hi' || msg.toLowerCase() === 'hello' || !userState[from]) {
                userState[from] = { step: 0, data: {} };
            }


            // --- Language & Main Menu ---
            if (userState[from].step === 0) {
                userState[from].step = 1;
                return await twilioMessageServices.languageTempMessage(from);
            } else if (userState[from].step === 1) {
                if (msg.toLowerCase() === 'language_english_list' || buttonPayload === 'bbcorp_language_english') {
                    userState[from].step = 2;
                    return await twilioMessageServices.mainMenubarTempMessage(from);
                } else {
                    twiml.message(`❌ Sorry, only English is supported at the moment.`);
                }

                // --- Signup Flow ---
            } else if (msg.toLowerCase() === 'main_menu_signup_list' || buttonPayload === 'bbcorp_main_menu_signup') {
                console.log(`Starting signup process for ${from}`);
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
                        const payload = {
                            name: `${userState[from].data.firstName} ${userState[from].data.lastName}`,
                            email: userState[from].data.email,
                            password: userState[from].data.password,
                            phoneNumber: userState[from].data.phone,
                        };
                        await crmApiServices.signup(from, payload);
                        twiml.message(
                            `✅ Thank you for joining BB Corp’s Whatsapp Trading Portal! Please verify your account with the link sent to your email.`
                        );
                        userState[from] = { step: 0, data: {} };
                    } catch (error) {
                        twiml.message(error.message || `❌ An error occurred while signing up. Please try again later.`);
                    }
                } else if (msg.toLowerCase() === 'restart') {
                    twiml.message(`🔄 Restarting the signup process. Let's start again!`);
                    userState[from] = { step: 0, data: {} };
                } else {
                    twiml.message(
                        `❌ Invalid option. Please type "CONFIRM" to proceed or "RESTART" to start over.`
                    );
                }

                // --- Login Flow ---
            } else if (msg.toLowerCase() === 'main_menu_login_list' || buttonPayload === 'bbcorp_main_menu_login') {
                twiml.message(`🔐 Please provide your registered email address.`);
                userState[from].step = 'login-email';
            } else if (userState[from].step === 'login-email') {
                userState[from].data.email = msg.trim();
                twiml.message(`✅ Email received! Now, please provide your password.`);
                userState[from].step = 'login-password';
            } else if (userState[from].step === 'login-password') {
                const password = msg.trim();
                const email = userState[from].data.email;
                try {
                    const loginRes = await crmApiServices.login(from, email, password);
                    if (loginRes.token) {
                        userState[from].data.token = loginRes.token;
                        twiml.message(`✅ Login successful! Welcome back, ${email}.`);
                        userState[from].step = 0;
                    } else {
                        twiml.message(loginRes.error || '❌ Login failed.');
                    }
                } catch (error) {
                    twiml.message(error.message || `❌ An error occurred while logging in. Please try again later.`);
                }

                // --- KYC Flow ---
            } else if (msg.toLowerCase() === 'main_menu_kyc_list' || buttonPayload === 'bbcorp_main_menu_kyc') {
                twiml.message(`📋 Let's start your KYC process! Please provide your date of birth (YYYY-MM-DD).`);
                userState[from].step = 'kyc-dob';
            } else if (userState[from].step === 'kyc-dob') {
                userState[from].data.dob = msg.trim();
                twiml.message(`Please provide your city.`);
                userState[from].step = 'kyc-city';
            } else if (userState[from].step === 'kyc-city') {
                userState[from].data.city = msg.trim();
                twiml.message(`Please provide your country.`);
                userState[from].step = 'kyc-country';
            } else if (userState[from].step === 'kyc-country') {
                userState[from].data.country = msg.trim();
                twiml.message(`Please provide your postal code.`);
                userState[from].step = 'kyc-postal';
            } else if (userState[from].step === 'kyc-postal') {
                userState[from].data.postalCode = msg.trim();
                twiml.message(`Please provide your street address.`);
                userState[from].step = 'kyc-street';
            } else if (userState[from].step === 'kyc-street') {
                userState[from].data.street = msg.trim();
                twiml.message(`Now, please upload your ID document as an attachment.`);
                userState[from].step = 'kyc-upload-id';
            } else if (userState[from].step === 'kyc-upload-id') {
                const numMedia = parseInt(req.body.NumMedia || 0);
                if (numMedia > 0) {
                    const fileName = `id_${from.replace('whatsapp:', '')}.${await getFileExtension(contentType)}`;
                    try {
                        const filePath = await downloadMediaFile(mediaUrl, fileName);
                        userState[from].data.identityPath = filePath;
                        twiml.message(`✅ ID document received. Now, please upload your address proof (utility bill) as an attachment, or type "SKIP" if not available.`);
                        userState[from].step = 'kyc-upload-utility';
                    } catch (error) {
                        twiml.message(`❌ Error processing your document. Please try again.`);
                    }
                } else {
                    twiml.message(`❌ No file detected. Please send your ID proof as an attachment.`);
                }
            } else if (userState[from].step === 'kyc-upload-utility') {
                if (msg.toLowerCase() === 'skip') {
                    userState[from].data.utilityPath = null;
                    userState[from].step = 'kyc-submit-profile';
                } else {
                    const numMedia = parseInt(req.body.NumMedia || 0);
                    if (numMedia > 0) {
                        const fileName = `utility_${from.replace('whatsapp:', '')}.${await getFileExtension(contentType)}`;
                        try {
                            const filePath = await downloadMediaFile(mediaUrl, fileName);
                            userState[from].data.utilityPath = filePath;
                            userState[from].step = 'kyc-submit-profile';
                        } catch (error) {
                            twiml.message(`❌ Error processing your document. Please try again.`);
                            return this._sendResponse(res, twiml);
                        }
                    } else {
                        twiml.message(`❌ No file detected. Please send your address proof as an attachment or type "SKIP".`);
                        return this._sendResponse(res, twiml);
                    }
                }
                // Proceed to profile submission
                twiml.message(`Submitting your KYC profile info...`);
                try {

                    const profilePayload = {
                        birthday: new Date(userState[from].data.dob).toISOString(),
                        city: userState[from].data.city,
                        country: userState[from].data.country,
                        postalCode: userState[from].data.postalCode,
                        street: userState[from].data.street
                    };
                    // Upload documents
                    await crmApiServices.uploadKycDocuments(from, {
                        identityPath: userState[from].data.identityPath,
                        utilityPath: userState[from].data.utilityPath
                    });

                    console.log(`Submitting KYC profile for ${from}:`, profilePayload);
                    await crmApiServices.submitKycProfile(from, profilePayload);

                    // Get agreements
                    const agreements = await crmApiServices.getAgreements(from);
                    userState[from].data.agreements = agreements;
                    if (agreements.length > 0) {
                        twiml.message(`You need to accept the following agreements:\n${agreements.map(a => `- ${a.title}`).join('\n')}\nType "ACCEPT" to accept all.`);
                        userState[from].step = 'kyc-accept-agreements';
                    } else {
                        userState[from].step = 'kyc-complete';
                        twiml.message(`No agreements to accept. Type "COMPLETE" to finish your KYC.`);
                    }
                } catch (error) {
                    twiml.message(error.message || `❌ KYC submission failed. Please try again later.`);
                    userState[from].step = 0;
                }
            } else if (userState[from].step === 'kyc-accept-agreements') {
                if (msg.toLowerCase() === 'accept') {
                    try {
                        for (const agreement of userState[from].data.agreements) {
                            await crmApiServices.acceptAgreement(from, agreement._id);
                        }
                        twiml.message(`✅ All agreements accepted. Type "COMPLETE" to finish your KYC.`);
                        userState[from].step = 'kyc-complete';
                    } catch (error) {
                        twiml.message(error.message || `❌ Agreement acceptance failed. Please try again.`);
                    }
                } else {
                    twiml.message(`Type "ACCEPT" to accept all agreements.`);
                }
            } else if (userState[from].step === 'kyc-complete') {
                if (msg.toLowerCase() === 'complete') {
                    try {
                        await crmApiServices.completeKyc(from);
                        twiml.message(`✅ Your KYC details have been submitted successfully!`);
                        userState[from] = { step: 0, data: {} };
                    } catch (error) {
                        twiml.message(error.message || `❌ KYC submission failed. Please try again later.`);
                    }
                } else {
                    twiml.message(`Type "COMPLETE" to finish your KYC process.`);
                }

                // --- Accounts Section ---
            } else if (msg.toLowerCase() === 'main_menu_deposit_list' || buttonPayload === 'bbcorp_main_menu_deposit') {
                twiml.message(`📂 Account Options:\n🧪 Get Demo Account\n🏦 Get Real Account`);
                userState[from].step = 'accounts-menu';
            } else if (userState[from].step === 'accounts-menu') {
                if (msg.toLowerCase().includes('real')) {
                    try {

                        const accounts = await crmApiServices.getAccounts(from, 'real');
                        if (accounts.length === 0) {
                            twiml.message('📂 No real accounts found.');
                        } else {
                            twiml.message('🏦 Real Accounts:\n' + accounts.map(a => `• ${a.accountNumber || 'No ID'}`).join('\n'));
                        }
                    } catch (error) {
                        twiml.message(error.message || '❌ Failed to fetch real accounts.');
                    }
                } else if (msg.toLowerCase().includes('demo')) {
                    try {

                        const accounts = await crmApiServices.getAccounts(from, 'demo');
                        if (accounts.length === 0) {
                            twiml.message('📂 No demo accounts found.');
                        } else {
                            twiml.message('🧪 Demo Accounts:\n' + accounts.map(a => `• ${a.accountNumber || 'No ID'}`).join('\n'));
                        }
                    } catch (error) {
                        twiml.message(error.message || '❌ Failed to fetch demo accounts.');
                    }
                } else {
                    twiml.message('❓ Please type "Get Real Account" or "Get Demo Account".');
                }

                // --- Deposit Section (Placeholder) ---
            } else if (msg.toLowerCase() === 'main_menu_deposit_list') {
                twiml.message(`💸 Choose your deposit method:\nDeposit via Crypto\nDeposit via Wish.\n(Note: Integration pending.)`);
                userState[from].step = 'deposit-menu';

                // --- Fallback ---
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
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const timestamp = new Date().getTime();
        const filePath = path.join(uploadDir, `${timestamp}_${fileName}`);
        const response = await axios({
            method: 'GET',
            url: mediaUrl,
            responseType: 'stream',
            auth: {
                username: process.env.TWILIO_ACCOUNT_SID,
                password: process.env.TWILIO_AUTH_TOKEN
            }
        });
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
    return types[contentType] || 'dat';
}