import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

import apiError from '../../../helper/apiError';
import userServices from "../../services/user";
import crmApiServices from "../../services/crmApi";
import twilioMessageServices from "../../services/twilioMessage";
import aiAssistant from "../../services/aiAssistant.js";
import { apiLogHandler } from "../../../helper/apiLogHandler";
const prisma = new PrismaClient();


const ERROR_MESSAGES = {
    GENERIC: "😕 Something's not quite working right. Let's try again or type 'hi' to restart.",
    INVALID_INPUT: "🤔 That doesn't seem right. Could you try again with a valid response?",
    SERVER_ERROR: "🛠️ We're having some technical difficulties. Please try again in a moment or contact our friendly support team.",
    API_ERROR: "🌐 We're having trouble connecting right now. Let's try again shortly.",
    LOGIN_FAILED: "🔐 We couldn't log you in. Double-check your details and let's try once more.",
    KYC_FAILED: "📋 We had a small issue with your verification. Let's try again.",
    UPLOAD_FAILED: "📤 Your document didn't upload successfully. Let's give it another try.",
    SESSION_ERROR: "⏱️ Your session may have timed out. Type 'hi' to get back on track.",
}
export class userController {

    async whatsappMessage(req, res, next) {
        try {
            const msg = req.body.Body?.trim();
            const from = req.body.From.replace('whatsapp:', '');
            const mediaUrl = req.body.MediaUrl0;
            const contentType = req.body.MediaContentType0;
            const buttonPayload = req.body.ButtonPayload;
            const numMedia = parseInt(req.body.NumMedia || 0);


            console.log(`Received message from ${from}: ${msg}`);
            console.log(`buttonPayload: ${buttonPayload}`);
            console.log(`Media: ${numMedia > 0 ? mediaUrl : 'None'}`);

            try {

                let session = await _getSessionFromDb(from);
                req.userId = from;
                await apiLogHandler(req, { from, msg, mediaUrl, contentType, buttonPayload, numMedia, session });

                // If no valid session exists, start from the beginning
                if (!session) {
                    session = { step: 'language-selection', data: {}, userFlow: 'whatsapp-template' };
                    await _saveSessionToDb(from, session);
                    return await twilioMessageServices.languageTempMessage(from);
                }

                console.log(`Current session step: ${session.step}`);

                // QUICK ACCESS FUNCTIONALITY - Process natural language commands
                // Only process messages that are NOT template button identifiers
                const isTemplateButtonId = msg && (
                    msg.includes('dashboard_section_option_') ||
                    msg.includes('menu_list_') ||
                    msg.includes('bbcorp_') ||
                    msg.includes('create_trading_account_') ||
                    msg.includes('transfer_confirmation_') ||
                    msg === 'english_list' ||
                    msg === 'language_english' ||
                    msg === 'language_urdu' ||
                    msg === 'language_ai' ||
                    msg === 'confirm' ||
                    msg === 'restart'
                );

                if (msg && !buttonPayload && !isTemplateButtonId && session.step !== 'language-selection') {
                    console.log('Attempting quick access processing...');

                    try {
                        const quickAccessResult = await aiAssistant.processQuickAccess(msg, session, from);

                        if (quickAccessResult.handled) {
                            console.log('Quick access handled the request');
                            if (quickAccessResult.success) {
                                console.log('Quick access successful');
                                return; // Exit early, request was handled
                            } else if (quickAccessResult.error) {
                                console.log('Quick access failed:', quickAccessResult.error);

                                // If it's a rate limit error, inform the user
                                if (quickAccessResult.error.includes('Rate limit') || quickAccessResult.error.includes('429')) {
                                    await twilioMessageServices.goBackTempMessage(from,
                                        `🤖 AI assistant is temporarily busy. Please try again in a few minutes or use the menu buttons below.`
                                    );
                                    // Show menu as fallback
                                    const user = await userServices.find({ whatsappPhone: from });
                                    if (user) {
                                        await twilioMessageServices.mainListTempMessage(from);
                                    } else {
                                        await twilioMessageServices.authTempate(from);
                                    }
                                    return;
                                }
                                // Continue with normal flow as fallback for other errors
                            } else {
                                return; // Quick access handled but didn't succeed (e.g., showed help message)
                            }
                        } else {
                            console.log('Quick access did not handle the request, continuing with normal flow');
                        }
                    } catch (error) {
                        console.error('Quick access error:', error);

                        // If AI fails completely, show a helpful message and menu
                        if (error.message && (error.message.includes('Rate limit') || error.message.includes('429'))) {
                            await twilioMessageServices.goBackTempMessage(from,
                                `🤖 AI assistant is currently overloaded. Please use the menu buttons below or try natural language commands again in a few minutes.`
                            );
                            // Show menu as fallback
                            const user = await userServices.find({ whatsappPhone: from });
                            if (user) {
                                await twilioMessageServices.mainListTempMessage(from);
                            } else {
                                await twilioMessageServices.authTempate(from);
                            }
                            return;
                        }
                        // Continue with normal flow as fallback for other errors
                    }
                }

                //NOTE LANGUAGE SELECTION AND MAIN MENU FLOW
                if (session.step === 'language-selection') {
                    if (['english_list', 'language_english',].includes(buttonPayload || msg?.toLowerCase())) {
                        session.step = 'main-menu';
                        session.language = 'english';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.authTempate(from);
                    }
                    if (['language_urdu', 'language_urdu',].includes(buttonPayload || msg?.toLowerCase())) {

                        session.step = 'main-menu';
                        session.language = 'arabic';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.authTempate(from);
                    }
                    if (['language_ai'].includes(buttonPayload || msg?.toLowerCase())) {

                        await twilioMessageServices.sendTextMessage(from, `❌ Sorry, only English is supported at the moment. Please select English to continue.`);
                        session.step = 'language-selection';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.languageTempMessage(from);
                    }
                    else {
                        await twilioMessageServices.sendTextMessage(from, `❌ Sorry, Please select any language to continue.`);
                        session.step = 'language-selection';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.languageTempMessage(from);
                    }
                }

                if (msg && (msg.toLowerCase().includes('code:') || msg.toLowerCase().includes('code :'))) {
                    console.log(`Referral code detected in message: ${msg}`);
                    // More flexible regex to catch various referral code formats
                    const referralCodeMatch = msg.match(/(?:.*(?:referral code|ref|code).*?[:\s]+)([A-Za-z0-9]+)/i);
                    if (referralCodeMatch) {
                        console.log(`Referral code found: ${referralCodeMatch[1]}`);
                        const referralCode = referralCodeMatch[1];
                        session.data = session.data || {};
                        session.data.referralCode = referralCode;
                        await _saveSessionToDb(from, session);

                        const welcomeMessage = `🎉 *Welcome to BBCorp!*\n\n` +
                            `Thanks for joining us with referral code: \`${referralCode}\`\n\n` +
                            `You're about to start an amazing trading journey! 🚀\n\n` +
                            `Your referral code has been saved and will be applied when you complete registration.\n\n` +
                            `Let's get started! Please choose your preferred language:`;

                        await twilioMessageServices.sendTextMessage(from, welcomeMessage);
                        session.step = 'language-selection';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.languageTempMessage(from);
                    }
                }

                if (['hi', 'hii', 'hello', 'hey bbcorp', 'menu', 'manu'].includes(msg?.toLowerCase() || buttonPayload)) {

                    // NOTE If user sends "hi" or similar, check if they are already logged in
                    try {
                        const user = await userServices.find({ whatsappPhone: from });

                        if (user) {
                            try {
                                const loginRes = await crmApiServices.login(from, user.email, user.password);

                                if (!loginRes.token) {
                                    session.step = 'auth-menu';
                                    await _saveSessionToDb(from, session);
                                    return await twilioMessageServices.authTempate(from);
                                }
                                session.data.token = loginRes.token;

                                try {
                                    const checkKyc = await crmApiServices.checkKycVerification(from);

                                    if (checkKyc.status === 'rejected' && checkKyc.pendingFields?.length > 0) {
                                        session.step = 'kyc-start';
                                        await _saveSessionToDb(from, session);
                                        return await twilioMessageServices.kycProcessStartTempMessage(from, 'rejected');

                                    } else if (checkKyc.status === 'pending') {
                                        session.step = 'kyc-complete';
                                        await _saveSessionToDb(from, session);
                                        return await twilioMessageServices.goBackTempMessage(from, `Your KYC is still pending. Please wait for approval.\n\nOr type "logout" to logout.`);
                                    } else if (checkKyc.pendingFields?.length > 0) {
                                        session.step = 'kyc-start';
                                        await _saveSessionToDb(from, session);
                                        return await twilioMessageServices.kycProcessStartTempMessage(from);

                                    } else {
                                        session.step = 'main-menu';
                                        await _saveSessionToDb(from, session);
                                        return await twilioMessageServices.mainListTempMessage(from);
                                    }
                                } catch (error) {
                                    console.error('Error checking KYC:', error);
                                    session.step = 'auth-menu';
                                    await _saveSessionToDb(from, session);
                                    return await twilioMessageServices.authTempate(from);
                                }
                            } catch (error) {
                                console.error('Login error:', error);
                                session.step = 'auth-menu';
                                await _saveSessionToDb(from, session);
                                return await twilioMessageServices.authTempate(from);
                            }
                        } else {
                            // No user found, show language selection
                            session.step = 'language-selection';
                            await _saveSessionToDb(from, session);
                            return await twilioMessageServices.languageTempMessage(from);
                        }
                    } catch (error) {
                        console.error('User search error:', error);
                        session.step = 'language-selection';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.languageTempMessage(from);
                    }
                }

                else if (['main_menu_login_list', 'bbcorp_main_menu_login',].includes(buttonPayload || msg?.toLowerCase())) {
                    // Login flow
                    session.step = 'login-email';
                    await _saveSessionToDb(from, session);
                    return await twilioMessageServices.sendTextMessage(from, `🔐 Please provide your registered email address.`);
                }
                else if (['main_menu_signup_list', 'bbcorp_main_menu_signup',].includes(buttonPayload || msg?.toLowerCase())) {
                    // Signup flow
                    session.step = 'signup-firstname';
                    await _saveSessionToDb(from, session);
                    return await twilioMessageServices.sendTextMessage(from, `Let's start! Please share your *first name* only (1/6)`);
                }

                else if (['menu_list_logout', 'menu_list_logout', 'logout'].includes(buttonPayload || msg?.toLowerCase())) {
                    // NOTE Logout flow
                    session = { step: 'language-selection', data: {} };
                    await _saveSessionToDb(from, session);
                    await userServices.deleteMany({ whatsappPhone: from });
                    await twilioMessageServices.sendTextMessage(from, `You have been logged out. Type "Hi" to start again.`);
                    await twilioMessageServices.languageTempMessage(from);
                    return;

                }

                // NOTE SIGNUP FLOW
                else if (session.step === 'signup-firstname') {
                    if (!msg || msg.length < 2) {
                        return await twilioMessageServices.sendTextMessage(from, `❌ Please enter a valid first name (minimum 2 characters)`);
                    } else {
                        session.data.firstName = msg;
                        session.step = 'signup-lastname';
                        await _saveSessionToDb(from, session);
                        // return await twilioMessageServices.sendTextMessage(from, `Nice to meet you, ${msg}! 👋\nPlease share your *last name* only (2/6)`);
                        return await twilioMessageServices.sendTextMessage(from, `Please share your *last name* only (2/6)`);
                    }
                }
                else if (session.step === 'signup-lastname') {
                    if (!msg || msg.length < 2) {
                        return await twilioMessageServices.sendTextMessage(from, `❌ Please enter a valid last name (minimum 2 characters).`);
                    } else {
                        session.data.lastName = msg;
                        session.step = 'signup-email';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from, `Now I will need your email address (3/6)`);
                    }
                }
                else if (session.step === 'signup-email') {
                    // Validate email format
                    if (!_isValidEmail(msg)) {
                        return await twilioMessageServices.sendTextMessage(from, `❌ Please enter a valid email address (e.g. name@example.com).`);
                    } else {
                        session.data.email = msg;
                        session.step = 'signup-phone';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from, `Now please share your phone number (4/6)`);
                    }
                }
                else if (session.step === 'signup-phone') {
                    // Basic phone number validation
                    if (!msg || msg.length < 6) {
                        return await twilioMessageServices.sendTextMessage(from, `❌ Please enter a valid phone number.`);
                    } else {
                        session.data.phone = msg;
                        session.step = 'signup-password';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from,
                            `Finally, please create a password that includes at least 6 characters, 1 special character, and 1 uppercase letter (5/6)`
                        );
                    }
                }
                else if (session.step === 'signup-password') {
                    const password = msg;
                    if (!/^(?=.*[A-Z])(?=.*[!@#$&*])(?=.*[0-9]).{6,}$/.test(password)) {
                        return await twilioMessageServices.sendTextMessage(from,
                            `❗ Your password is too weak. Please create a stronger password with at least 6 characters, 1 special character, and 1 uppercase letter. Please put a new password below:`
                        );
                    } else {
                        session.data.password = password;
                        session.step = 'signup-confirm-password';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from, `Excellent! Please reconfirm your password and you will be done! (6/6)`);
                    }
                }
                else if (session.step === 'signup-confirm-password') {
                    if (msg !== session.data.password) {
                        return await twilioMessageServices.sendTextMessage(from, `❌ Passwords do not match. Please enter the same password you provided before.`);
                    } else {
                        session.step = 'signup-review';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.signupConfirmationTemp(from, session.data);
                    }
                }
                else if (session.step === 'signup-review') {
                    if (msg?.toLowerCase() === 'confirm' || buttonPayload === 'bbcorp_signup_confirm') {
                        try {
                            const payload = {
                                name: `${session.data.firstName} ${session.data.lastName}`,
                                email: session.data.email,
                                password: session.data.password,
                                phoneNumber: session.data.phone,
                            };

                            // Add referral code if it exists
                            if (session.data.referralCode) {
                                payload.referralCode = session.data.referralCode;
                            }

                            await crmApiServices.signup(from, payload);
                            session.step = 'main-menu';
                            await _saveSessionToDb(from, session);

                            let successMessage = `✅ Thank you for joining BBCorp's Whatsapp Trading Portal! Please verify your account with the link sent to your email. You have 2 minutes to successfully login.`;

                            // Add referral confirmation message
                            if (session.data.referralCode) {
                                successMessage += `\n\n🎁 Your referral code \`${session.data.referralCode}\` has been applied to your account!`;
                            }

                            return await twilioMessageServices.goBackTempMessage(from, successMessage);
                        } catch (error) {
                            console.error('Signup error:', error);
                            return await twilioMessageServices.goBackTempMessage(from, error.message || ERROR_MESSAGES.SERVER_ERROR);

                        }
                    } else if (['restart', 'bbcorp_signup_restart'].includes(msg?.toLowerCase() || buttonPayload)) {
                        // Preserve referral code when restarting signup
                        const referralCode = session.data?.referralCode;
                        session = { step: 'signup-firstname', data: {} };
                        if (referralCode) {
                            session.data.referralCode = referralCode;
                        }
                        await _saveSessionToDb(from, session);

                        let restartMessage = `🔄 Restarting the signup process.\n\nLet's start again. Please share your *first name* only (1/6).\n\nOr type *Hi* to go back.`;
                        if (referralCode) {
                            restartMessage += `\n\n🎁 Your referral code \`${referralCode}\` is still saved!`;
                        }

                        return await twilioMessageServices.sendTextMessage(from, restartMessage);
                    } else {
                        return await twilioMessageServices.goBackTempMessage(from, `❌ Invalid option. Please select CONFIRM to proceed or RESTART to start over.`);
                    }
                }


                // NOTE LOGIN FLOW
                else if (session.step === 'login-email') {
                    if (!_isValidEmail(msg)) {
                        return await twilioMessageServices.sendTextMessage(from, `🤔 That email address doesn't look quite right. Could you please enter a valid email? (like name@example.com)`);
                    } else {
                        session.data.email = msg.trim();
                        session.step = 'login-password';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from, `Great! Now please enter your password. 🔒\n\nRest assured, your security is our priority! Our team will never ask for your password during support calls.`);
                    }
                }
                else if (session.step === 'login-password') {
                    if (!msg || msg.length < 6) {
                        return await twilioMessageServices.sendTextMessage(from, `❌ Please enter a valid password (minimum 6 characters).`);
                    } else {
                        const password = msg.trim();
                        const email = session.data.email;
                        try {
                            const loginRes = await crmApiServices.login(from, email, password);
                            if (loginRes.token) {
                                session.data.token = loginRes.token;

                                // Now check KYC status
                                try {
                                    const checkKyc = await crmApiServices.checkKycVerification(from);
                                    if (checkKyc.status === 'rejected' && checkKyc.pendingFields?.length > 0) {
                                        session.step = 'kyc-start';
                                        await _saveSessionToDb(from, session);
                                        return await twilioMessageServices.kycProcessStartTempMessage(from, 'rejected');

                                    } else if (checkKyc.status === 'pending') {
                                        session.step = 'kyc-complete';
                                        await _saveSessionToDb(from, session);
                                        return await twilioMessageServices.goBackTempMessage(from, `Your KYC is still pending. Please wait for approval.\n\nOr type "logout" to logout.`);
                                    } else if (checkKyc.pendingFields?.length > 0) {
                                        session.step = 'kyc-start';
                                        await _saveSessionToDb(from, session);
                                        return await twilioMessageServices.kycProcessStartTempMessage(from);
                                    } else {
                                        // KYC is approved, proceed to main menu
                                        session.step = 'main-menu';
                                        await _saveSessionToDb(from, session);
                                        return await twilioMessageServices.mainListTempMessage(from);
                                    }
                                } catch (error) {
                                    console.error('KYC check error:', error);
                                    // If KYC check fails, still show main menu
                                    session.step = 'main-menu';
                                    await _saveSessionToDb(from, session);
                                    return await twilioMessageServices.mainListTempMessage(from);
                                }
                            } else {
                                return await twilioMessageServices.goBackTempMessage(from, `❌ Invalid credentials.`);

                            }
                        } catch (error) {
                            return await twilioMessageServices.goBackTempMessage(from, ERROR_MESSAGES.API_ERROR);
                        }
                    }
                }

                // NOTE KYC FLOW
                else if (session.step === 'kyc-start') {
                    session.step = 'kyc-street';
                    await _saveSessionToDb(from, session);
                    return await twilioMessageServices.sendTextMessage(from, `Let's start! Please share your street address (1/6)`);
                }
                else if (session.step === 'kyc-street') {
                    if (!msg || msg.length < 5) {
                        return await twilioMessageServices.sendTextMessage(from, `🏡 We need a complete street address. Please provide more details.`);
                    } else {
                        session.data.street = msg.trim();
                        session.step = 'kyc-city';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from, `Perfect! Now, which city do you live in? (2/6) 🏙️`);
                    }
                }
                else if (session.step === 'kyc-city') {
                    if (!msg || msg.length < 2) {
                        return await twilioMessageServices.sendTextMessage(from, `❌ Please enter a valid city name.`);
                    } else {
                        session.data.city = msg.trim();
                        session.step = 'kyc-postal';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from, `Please share your postal code (3/6)`);
                    }
                }
                else if (session.step === 'kyc-postal') {
                    if (!msg || msg.length < 2) {
                        return await twilioMessageServices.sendTextMessage(from, `❌ Please enter a valid postal code.`);
                    } else {
                        session.data.postalCode = msg.trim();
                        session.step = 'kyc-country';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from, `Please share the country you reside in (4/6)`);
                    }
                }
                else if (session.step === 'kyc-country') {
                    if (!msg || msg.length < 2) {
                        return await twilioMessageServices.sendTextMessage(from, `❌ Please enter a valid country name.`);
                    } else {
                        session.data.country = msg.trim();
                        session.step = 'kyc-dob';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from, `Your date of birth format : (Month/Date/Year) (5/6)`);
                    }
                }
                else if (session.step === 'kyc-dob') {
                    // Validate date format
                    if (!_isValidDate(msg.trim())) {
                        return await twilioMessageServices.sendTextMessage(from, `❌ Invalid date format. Please enter date as MM/DD/YYYY (e.g. 01/31/1990).`);
                    } else {
                        session.data.dob = msg.trim();
                        session.step = 'kyc-upload-id';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from, `Please provide an image of your Passport or ID (6/6)`);
                    }
                }
                else if (session.step === 'kyc-upload-id') {
                    if (numMedia > 0) {
                        const fileName = `id_${from.replace('+', '')}.${await _getFileExtension(contentType)}`;
                        try {
                            const filePath = await _downloadMediaFile(mediaUrl, fileName);
                            session.data.identityPath = filePath;
                            session.step = 'kyc-upload-utility';
                            await _saveSessionToDb(from, session);
                            return await twilioMessageServices.skipKycProcessTempMessage(from);
                        } catch (error) {
                            console.error("Error downloading ID document:", error);
                            return await twilioMessageServices.sendTextMessage(from, `❌ Error processing your document. Please try again or send a different image.`);
                        }
                    } else {
                        await twilioMessageServices.sendTextMessage(from, `❌ No file detected. Please send your ID proof as an attachment.`);
                    }
                }
                else if (session.step === 'kyc-upload-utility') {
                    if (msg?.toLowerCase() === 'skip' || buttonPayload === 'skip_kyc_address_proof') {
                        session.data.utilityPath = null;
                        session.step = 'kyc-complete';
                        await _saveSessionToDb(from, session);

                        const success = await _processKycDocuments(from);
                        if (!success) {
                            // If processing failed, stay on the same step
                            session.step = 'kyc-upload-utility';
                            await _saveSessionToDb(from, session);
                            return await twilioMessageServices.sendTextMessage(from, `Please try uploading your documents again or type "SKIP" to proceed without address proof.`);
                        }
                    } else if (numMedia > 0) {
                        const fileName = `utility_${from.replace('+', '')}.${await _getFileExtension(contentType)}`;
                        try {
                            const filePath = await _downloadMediaFile(mediaUrl, fileName);
                            session.data.utilityPath = filePath;
                            session.step = 'kyc-complete';
                            await _saveSessionToDb(from, session);

                            const success = await _processKycDocuments(from);
                            if (!success) {
                                // If processing failed, stay on the same step
                                session.step = 'kyc-upload-utility';
                                await _saveSessionToDb(from, session);
                                return await twilioMessageServices.sendTextMessage(from, `Please try uploading your documents again or type "SKIP" to proceed without address proof.`);
                            }
                        } catch (error) {
                            console.error("Error downloading utility document:", error);
                            return await twilioMessageServices.goBackTempMessage(from, `❌ Error processing your document. Please try again or send a different image.`);
                        }
                    } else {
                        return await twilioMessageServices.goBackTempMessage(from, `❌ No file detected. Please send your address proof as an attachment or type "SKIP".`);
                    }
                }

                else if (session.step === 'kyc-complete') {
                    if (msg?.toLowerCase() === 'complete') {
                        try {
                            await crmApiServices.completeKyc(from);
                            return await twilioMessageServices.sendTextMessage(from, `🎉 Amazing! Your KYC has been approved! 🎊\n\nYou're all set to experience the full BBCorp WhatsApp trading experience. Ready to make your first deposit?`);
                        } catch (error) {
                            console.error("Error completing KYC:", error);
                            await twilioMessageServices.sendTextMessage(from, `😕 Your KYC submission hit a small bump. Let's try again shortly.`);
                            session.step = 'kyc-start';
                            await _saveSessionToDb(from, session);
                            return await twilioMessageServices.kycProcessStartTempMessage(from, 'rejected')
                        }
                    }
                    session.step = 'main-menu';
                    await _saveSessionToDb(from, session);
                    return await twilioMessageServices.dashboardTempMessage(from);
                }


                // NOTE DASHBOARD FLOW
                else if (['menu_list_dashboard', 'menu_list_dashboard', 'dashboard'].includes(buttonPayload || msg?.toLowerCase())) {
                    try {
                        const realAccounts = await crmApiServices.getAccounts(from, 'real') || [];
                        const demoAccounts = await crmApiServices.getAccounts(from, 'demo') || [];
                        const wallet = await crmApiServices.getWallet(from)
                        const user = await userServices.find({ whatsappPhone: from });
                        const userName = user?.firstName || "there";

                        // let accountsMessage = `🏦 Account Summary*\n\n`;

                        // if (wallet.length > 0) {
                        //     accountsMessage += "💰 *Wallet:*";
                        //     accountsMessage += wallet.map((acc, i) =>
                        //         ` $${acc.balance || 0}`).join('\n') + "\n\n";
                        // } else {
                        //     accountsMessage += "📂 No wallet found yet. Let's set one up!\n\n";
                        // }

                        // accountsMessage += "📊 *Real Account(s):*\n";
                        // if (realAccounts.length > 0) {
                        //     accountsMessage += realAccounts.map((acc, i) =>
                        //         `${i + 1}. ${acc.name || 'N/A'}: $${acc.balance || 0}`).join('\n') + "\n\n";

                        //     accountsMessage += `Total Real Balance: $${realAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)}\n\n`;
                        // } else {
                        //     accountsMessage += "📂 No real accounts found.\n\n";
                        // }

                        // accountsMessage += "🧪 *Demo Account(s):*\n";
                        // if (demoAccounts.length > 0) {
                        //     accountsMessage += demoAccounts.map((acc, i) =>
                        //         `${i + 1}. ${acc.name || 'N/A'}: $${acc.balance || 0}`).join('\n') + "\n\n";
                        //     accountsMessage += `Total Demo Balance: $${demoAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)}`;
                        // } else {
                        //     accountsMessage += "📂 No demo accounts found.";
                        // }

                        // await twilioMessageServices.sendTextMessage(from, accountsMessage);
                        const imageData = {
                            accountHolderName: userName,
                            balance: wallet[0]?.balance || 0,
                            currency: 'USD',
                            realAccounts: realAccounts.map((acc, i) => ({
                                sn: i + 1,
                                name: acc.name || 'N/A',
                                amount: `$${acc.balance || 0}`
                            })),
                            demoAccounts: demoAccounts.map((acc, i) => ({
                                sn: i + 1,
                                name: acc.name || 'N/A',
                                // amount: `$${acc.balance || 0} ${acc?.currency?.name || "USD"}`
                                amount: `$${acc.balance || 0}`
                            }))
                        };

                        // send await message for dashboard image 
                        const userWaitMessage = `⏳ Please wait while we fetch your account details...`;
                        await twilioMessageServices.sendTextMessage(from, userWaitMessage);
                        await twilioMessageServices.sendMediaFile(from, imageData, '');

                        // Add a small delay to ensure media is processed before sending the dashboard message
                        await new Promise(resolve => setTimeout(resolve, 2000));

                        await twilioMessageServices.deshboardSectionTempMessage(from, 'Welcome to your dashboard, ' + userName + '!');
                        return;
                    } catch (error) {
                        console.error("Error fetching accounts:", error);
                        await twilioMessageServices.goBackTempMessage(from, `😕 We had trouble accessing your accounts. Let's try again in a moment or contact our support team if this continues.`);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        return;
                    }
                }

                // NOTE DASHBOARD DEPOSIT FLOW
                else if (['menu_list_deposit', 'dashboard_section_option_deposit', 'deposit'].includes(msg?.toLowerCase() || buttonPayload)) {
                    session.step = 'dashboard-deposit-options';
                    await _saveSessionToDb(from, session);
                    return await twilioMessageServices.deshboardDepositTempMessage(from);
                }

                else if (session.step === 'dashboard-deposit-options') {
                    const wallets = await crmApiServices.getWallet(from);
                    if (!wallets || wallets.length === 0) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ You don't have any wallets available for deposit. Please create a wallet first.`);
                        return;
                    }

                    // Store wallet ID for later use
                    session.data = session.data || {};
                    session.data.walletId = wallets[0]?._id || "";

                    const paymentGateways = await crmApiServices.getPaymentGateway(from);
                    if (!paymentGateways || paymentGateways.length === 0) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ No payment gateways are available at the moment. Please try again later.`);
                        return;
                    }

                    if (['dashboard_section_option_deposit_match2pay'].includes(buttonPayload || msg?.toLowerCase())) {
                        const match2pay = paymentGateways.find(gateway => gateway.uniqueName === 'match2pay');
                        if (!match2pay) {
                            await twilioMessageServices.goBackTempMessage(from, `❌ Match2Pay payment option is not available at the moment.`);
                            return;
                        }

                        session.data.selectedPaymentGateway = match2pay._id;
                        session.data.selectedPaymentGatewayName = 'match2pay';
                        session.step = 'dashboard-deposit-amount';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.sendTextMessage(from, `What is the amount you would like to deposit via Match2Pay? (Minimum amount: $10)`);
                    }

                    else if (['dashboard_section_option_deposit_whishMoney'].includes(buttonPayload || msg?.toLowerCase())) {
                        const whishMoney = paymentGateways.find(gateway => gateway.uniqueName === 'whishMoney');
                        if (!whishMoney) {
                            await twilioMessageServices.goBackTempMessage(from, `❌ Whish Money payment option is not available at the moment.`);
                            return;
                        }

                        session.data.selectedPaymentGateway = whishMoney._id;
                        session.data.selectedPaymentGatewayName = 'whishMoney';
                        session.step = 'dashboard-deposit-amount';
                        await _saveSessionToDb(from, session);
                        await twilioMessageServices.sendTextMessage(from, `What is the amount you would like to deposit via Whish Money? (Minimum amount: $10)`);
                        return;
                    }

                    else if (['dashboard_section_option_deposit_go_back'].includes(buttonPayload || msg?.toLowerCase())) {
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.mainListTempMessage(from);
                    }
                    else {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Invalid deposit option. Please select a valid payment method.`);
                        return;
                    }
                }

                else if (session.step === 'dashboard-deposit-amount') {
                    const amount = parseFloat(msg.replace(/[^\d.]/g, ''));
                    if (isNaN(amount) || amount < 10) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Please enter a valid amount (minimum $10).`);
                        return;
                    }

                    session.data.depositAmount = amount;
                    await processDepositTransaction(from, session);
                    return;
                }

                // Handle quick access deposit when only amount was provided initially
                else if (session.step === 'dashboard-deposit-options' && session.data?.quickAccessAmount) {
                    const wallets = await crmApiServices.getWallet(from);
                    if (!wallets || wallets.length === 0) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ You don't have any wallets available for deposit. Please create a wallet first.`);
                        return;
                    }

                    session.data.walletId = wallets[0]?._id || "";
                    const paymentGateways = await crmApiServices.getPaymentGateway(from);

                    if (['dashboard_section_option_deposit_match2pay'].includes(buttonPayload || msg?.toLowerCase())) {
                        const match2pay = paymentGateways.find(gateway => gateway.uniqueName === 'match2pay');
                        if (!match2pay) {
                            await twilioMessageServices.goBackTempMessage(from, `❌ Match2Pay payment option is not available.`);
                            return;
                        }

                        session.data.selectedPaymentGateway = match2pay._id;
                        session.data.selectedPaymentGatewayName = 'match2pay';
                        session.data.depositAmount = session.data.quickAccessAmount;

                        // Process the deposit immediately since we have all info
                        await processDepositTransaction(from, session);
                        return;
                    }
                    else if (['dashboard_section_option_deposit_whishMoney'].includes(buttonPayload || msg?.toLowerCase())) {
                        const whishMoney = paymentGateways.find(gateway => gateway.uniqueName === 'whishMoney');
                        if (!whishMoney) {
                            await twilioMessageServices.goBackTempMessage(from, `❌ Whish Money payment option is not available.`);
                            return;
                        }

                        session.data.selectedPaymentGateway = whishMoney._id;
                        session.data.selectedPaymentGatewayName = 'whishMoney';
                        session.data.depositAmount = session.data.quickAccessAmount;

                        // Process the deposit immediately since we have all info
                        await processDepositTransaction(from, session);
                        return;
                    }
                    else if (['dashboard_section_option_deposit_go_back'].includes(buttonPayload || msg?.toLowerCase())) {
                        delete session.data.quickAccessAmount;
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.mainListTempMessage(from);
                    }
                }

                // Handle quick access amount input when payment method was provided first
                else if (session.step === 'quick-deposit-amount-input') {
                    const amount = parseFloat(msg.replace(/[^\d.]/g, ''));
                    if (isNaN(amount) || amount < 10) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Please enter a valid amount (minimum $10).`);
                        return;
                    }

                    // Now we have both amount and payment method, process the deposit
                    const wallets = await crmApiServices.getWallet(from);
                    const paymentGateways = await crmApiServices.getPaymentGateway(from);
                    const gateway = paymentGateways.find(g =>
                        g.uniqueName.toLowerCase() === session.data.selectedPaymentGatewayName.toLowerCase()
                    );

                    if (gateway) {
                        session.data.walletId = wallets[0]._id;
                        session.data.selectedPaymentGateway = gateway._id;
                        session.data.depositAmount = amount;
                        await processDepositTransaction(from, session);
                    } else {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Payment method not available.`);
                    }
                    return;
                }

                // Handle quick access withdraw amount input
                else if (session.step === 'quick-withdraw-amount-input') {
                    const amount = parseFloat(msg.replace(/[^\d.]/g, ''));
                    const wallet = await crmApiServices.getWallet(from);
                    const balance = wallet && wallet.length > 0 ? wallet[0].balance : 0;

                    if (isNaN(amount) || amount <= 0) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Please enter a valid amount.`);
                        return;
                    }

                    if (amount > balance) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Your current balance ($${balance}) is less than the requested amount ($${amount}).`);
                        return;
                    }

                    // Process withdrawal with the provided payment method and amount
                    const paymentGateways = await crmApiServices.getPaymentGateway(from);
                    const gateway = paymentGateways.find(g =>
                        g.uniqueName.toLowerCase() === session.data.selectedPaymentGatewayName.toLowerCase()
                    );

                    if (gateway) {
                        session.data.walletId = wallet[0]._id;
                        session.data.selectedPaymentGateway = gateway._id;
                        session.data.withdrawAmount = amount;
                        await processWithdrawalTransaction(from, session);
                    } else {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Withdrawal method not available.`);
                    }
                    return;
                }

                // Handle quick access create account name input
                else if (session.step === 'quick-create-account-name') {
                    const accountName = msg.trim();
                    if (!accountName || accountName.length < 2) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Please provide a valid account name (at least 2 characters).`);
                        return;
                    }

                    try {
                        const accountData = {
                            name: accountName,
                            balance: session.data.accountType === 'demo' ? 10000 : 0
                        };

                        const result = await crmApiServices.createTradingAccount(from, session.data.accountType, accountData);

                        await twilioMessageServices.sendTextMessage(from,
                            `✅ ${session.data.accountType === 'demo' ? 'Demo' : 'Real'} account created successfully: ${accountName}`
                        );

                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        await twilioMessageServices.mainListTempMessage(from);
                    } catch (error) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Failed to create account: ${error.message}`);
                    }
                    return;
                }

                // NOTE DASHBOARD TRANSFER FLOW

                else if (['dashboard_section_option_transfer_to_account', 'menu_list_transfer_to_account', 'transfer'].includes(buttonPayload || msg?.toLowerCase())) {
                    // Initialize the flow
                    session.step = 'dashboard-transfer-select-source';
                    session.data = session.data || {};
                    await _saveSessionToDb(from, session);

                    try {
                        // Get both wallets and accounts for source selection
                        const wallets = await crmApiServices.getWallet(from);
                        const accounts = await crmApiServices.getAccounts(from, 'real');

                        if ((!wallets || wallets.length === 0) && (!accounts || accounts.length === 0)) {
                            await twilioMessageServices.goBackTempMessage(from, `❌ You don't have any wallets or trading accounts available.`);
                            return;
                        }

                        // Store the accounts and wallets in session for reference
                        session.data.wallets = wallets;
                        session.data.accounts = accounts;
                        await _saveSessionToDb(from, session);

                        // Build numbered list of source accounts
                        let sourceAccountListMessage = `*Select Source Account*\n\n`;

                        // Add wallets to the list
                        if (wallets && wallets.length > 0) {
                            wallets.forEach((wallet, index) => {
                                sourceAccountListMessage += `${index + 1}. *Wallet* - $${wallet.balance || 0}\n\n`;
                            });
                        }

                        // Add accounts to the list, continuing the numbering
                        let startIndex = (wallets && wallets.length) || 0;
                        if (accounts && accounts.length > 0) {
                            accounts.forEach((acc, index) => {
                                sourceAccountListMessage += `${startIndex + index + 1}. ${acc?.name || ''}(*${acc?.client_login || 'Account'}*) - $${acc?.balance || 0}\n`;
                            });
                        }

                        sourceAccountListMessage += `\n\nPlease select a source account by replying with the number (e.g. "1").`;
                        await twilioMessageServices.sendTextMessage(from, sourceAccountListMessage);
                        return;

                    } catch (error) {
                        console.error('Error fetching accounts or wallets:', error);
                        await twilioMessageServices.goBackTempMessage(from, `❌ There was an error fetching your accounts. Please try again later.`);
                        return;
                    }
                }

                // Handle source account selection
                else if (session.step === 'dashboard-transfer-select-source') {
                    const userInput = msg.trim();
                    const selectedIndex = parseInt(userInput) - 1;
                    const wallets = session.data.wallets || [];
                    const accounts = session.data.accounts || [];
                    const totalOptions = wallets.length + accounts.length;

                    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= totalOptions) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Invalid selection. Please select a number between 1 and ${totalOptions}.`);
                        return;
                    }

                    // Determine if selection is a wallet or account
                    if (selectedIndex < wallets.length) {
                        // Selected a wallet
                        session.data.sourceType = 'wallet';
                        session.data.sourceId = wallets[selectedIndex]._id;
                        session.data.sourceName = `*Wallet* - $${wallets[selectedIndex].balance || 0}`;
                    } else {
                        // Selected an account
                        const accountIndex = selectedIndex - wallets.length;
                        session.data.sourceType = 'account';
                        session.data.sourceId = accounts[accountIndex]._id;
                        session.data.sourceName = `${accounts[accountIndex]?.name || ''}(*${accounts[accountIndex]?.client_login || 'Account'}*) - $${accounts[accountIndex]?.balance || 0}`;
                    }

                    session.step = 'dashboard-transfer-select-destination';
                    await _saveSessionToDb(from, session);

                    try {
                        let targetAccountListMessage = `*Select Destination Account*\n\n`;
                        let targetOptions = [];

                        // If source is wallet, show only trading accounts
                        if (session.data.sourceType === 'wallet') {
                            const accounts = await crmApiServices.getAccounts(from, 'real');
                            if (!accounts || accounts.length === 0) {
                                await twilioMessageServices.goBackTempMessage(from, `❌ You don't have any trading accounts available for transfer.`);
                                return;
                            }

                            // Build numbered list of trading accounts
                            accounts.forEach((acc, index) => {
                                targetAccountListMessage += `${index + 1}. ${acc?.name || ''}(*${acc?.client_login || 'Account'}*) - $${acc?.balance || 0}\n`;
                            });

                            session.data.targetAccounts = accounts;
                        }
                        // If source is account, show only wallets
                        else if (session.data.sourceType === 'account') {
                            const wallets = await crmApiServices.getWallet(from);
                            if (!wallets || wallets.length === 0) {
                                await twilioMessageServices.goBackTempMessage(from, `❌ You don't have any wallets available for transfer.`);
                                return;
                            }

                            // Build numbered list of wallets
                            wallets.forEach((wallet, index) => {
                                targetAccountListMessage += `${index + 1}. *Wallet* - $${wallet.balance || 0}\n`;
                            });

                            session.data.targetAccounts = wallets;
                        }
                        await _saveSessionToDb(from, session);
                        targetAccountListMessage += `\n\nPlease select a destination account by replying with the number (e.g. "1").`;
                        await twilioMessageServices.sendTextMessage(from, targetAccountListMessage);
                        return;
                    } catch (error) {
                        console.error('Error fetching destination accounts:', error);
                        await twilioMessageServices.goBackTempMessage(from, `❌ There was an error fetching destination accounts. Please try again later.`);
                        return;
                    }
                }

                // Handle destination account selection
                else if (session.step === 'dashboard-transfer-select-destination') {
                    const userInput = msg.trim();
                    const selectedIndex = parseInt(userInput) - 1;
                    const targetAccounts = session.data.targetAccounts || [];

                    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= targetAccounts.length) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Invalid selection. Please select a number between 1 and ${targetAccounts.length}.`);
                        return;
                    }

                    // Store selected destination
                    session.data.destinationId = targetAccounts[selectedIndex]._id;
                    if (session.data.sourceType === 'wallet') {
                        session.data.destinationType = 'account';
                        session.data.destinationName = `${targetAccounts[selectedIndex]?.name || ''}(*${targetAccounts[selectedIndex]?.client_login || 'Account'}*) - $${targetAccounts[selectedIndex]?.balance || 0}`;
                    } else {
                        session.data.destinationType = 'wallet';
                        session.data.destinationName = `*Wallet*- $${targetAccounts[selectedIndex].balance || 0}`;
                    }


                    // Extract the source account balance for validation
                    let availableBalance = 0;
                    if (session.data.sourceType === 'wallet') {
                        const sourceWallet = session.data.wallets.find(wallet => wallet._id === session.data.sourceId);
                        availableBalance = sourceWallet?.balance || 0;
                    } else {
                        const sourceAccount = session.data.accounts.find(account => account._id === session.data.sourceId);
                        availableBalance = sourceAccount?.balance || 0;
                    }

                    // Store available balance for validation
                    session.data.availableBalance = availableBalance;

                    session.step = 'dashboard-transfer-amount';
                    await _saveSessionToDb(from, session);

                    // Ask for transfer amount

                    await twilioMessageServices.sendTextMessage(from, `Available Balance: *$${availableBalance}*\n\nPlease enter the amount you want to transfer (minimum 0.01, maximum $${availableBalance}).`);
                    return;
                }

                // Handle transfer amount
                else if (session.step === 'dashboard-transfer-amount') {
                    const amount = parseFloat(msg.replace(/[^\d.]/g, ''));
                    const availableBalance = session.data.availableBalance || 0;

                    if (isNaN(amount) || amount < 0.01) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Please enter a valid amount (minimum 0.01).`);
                        return;
                    }

                    if (amount > availableBalance) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Insufficient balance. Your available balance is $${availableBalance}. Please enter a smaller amount.`);
                        return;
                    }

                    session.data.transferAmount = amount;
                    session.step = 'dashboard-transfer-confirmation';
                    await _saveSessionToDb(from, session);

                    await twilioMessageServices.transferConfirmationTempMessage(from, amount, availableBalance, session.data.sourceName, session.data.destinationName);
                    return;
                }

                // Handle transfer confirmation
                else if (session.step === 'dashboard-transfer-confirmation') {
                    if (msg === '2' || msg.toLowerCase() === 'cancel' || buttonPayload === 'transfer_confirmation_cancel') {
                        await twilioMessageServices.sendTextMessage(from, `Transfer cancelled.`);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.mainListTempMessage(from);
                    }

                    if (msg === '1' || msg.toLowerCase() === 'confirm' || buttonPayload === 'transfer_confirmation_confirm') {
                        try {
                            let payload = {
                                amount: session.data.transferAmount
                            };

                            // Prepare payload based on source and destination types
                            if (session.data.sourceType === 'wallet' && session.data.destinationType === 'account') {
                                payload.wallet = session.data.sourceId;
                                payload.account = session.data.destinationId;

                                // Call the API to process transfer from wallet to account
                                const response = await crmApiServices.createTransferFromWallet(from, payload);

                                return await twilioMessageServices.goBackTempMessage(from, `✅ ${response.message || 'Transfer completed successfully!'}`);
                            }
                            else if (session.data.sourceType === 'account' && session.data.destinationType === 'wallet') {
                                payload.account = session.data.sourceId;
                                payload.wallet = session.data.destinationId;

                                // Call the API to process transfer from account to wallet
                                const response = await crmApiServices.createTransferFromAccount(from, payload);

                                return await twilioMessageServices.goBackTempMessage(from, `✅ ${response.message || 'Transfer completed successfully!'}`);
                            }
                            return await twilioMessageServices.goBackTempMessage(from, `❌ Invalid transfer request. Please try again.`);
                        } catch (error) {
                            console.error('Error processing transfer:', error);
                            await twilioMessageServices.goBackTempMessage(from, `❌ There was an error processing your transfer: ${error.response?.data?.message || 'Please try again later.'}`);
                            return;
                        }
                    }
                    else {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Invalid selection. Please reply with 1 to confirm or 2 to cancel.`);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        return;
                    }
                }

                // NOTE DASHBOARD WITHDRAW FLOW
                else if (['dashboard_section_option_withdraw', 'menu_list_withdraw', 'withdraw'].includes(buttonPayload || msg?.toLowerCase())) {
                    const wallets = await crmApiServices.getWallet(from);
                    if (!wallets || wallets.length === 0) {
                        await twilioMessageServices.sendTextMessage(from, `❌ You don't have any wallets available for withdrawal. Please create a wallet first.`);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.mainListTempMessage(from);
                    }

                    // Store wallet ID for later use
                    session.data = session.data || {};
                    session.data.walletId = wallets[0]?._id || "";
                    const balance = (wallets[0]?.balance || 0).toFixed(3) || 0;

                    session.step = 'dashboard-withdraw-options';
                    await _saveSessionToDb(from, session);
                    return await twilioMessageServices.deshboardWithdrawTempMessage(from, balance);
                }
                else if (session.step === 'dashboard-withdraw-options') {
                    const wallets = await crmApiServices.getWallet(from);
                    if (!wallets || wallets.length === 0) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ You don't have any wallets available for withdrawal. Please create a wallet first.`);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        return;
                    }

                    // Make sure wallet ID is stored
                    session.data = session.data || {};
                    session.data.walletId = session.data.walletId || wallets[0]?._id || "";

                    const paymentGateways = await crmApiServices.getPaymentGateway(from);
                    if (!paymentGateways || paymentGateways.length === 0) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ No payment gateways are available at the moment. Please try again later.`);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        return;
                    }

                    if (['dashboard_section_option_withdraw_match2pay'].includes(buttonPayload || msg?.toLowerCase())) {
                        const match2pay = paymentGateways.find(gateway => gateway.uniqueName === 'match2pay');
                        if (!match2pay) {
                            await twilioMessageServices.goBackTempMessage(from, `❌ Match2Pay withdrawal option is not available at the moment.`);
                            session.step = 'dashboard-withdraw-options'; // Ensure step is reset
                            await _saveSessionToDb(from, session);
                            return;
                        }

                        session.data.selectedPaymentGateway = match2pay._id;
                        session.data.selectedPaymentGatewayName = 'match2pay';
                        session.step = 'dashboard-withdraw-amount';
                        await _saveSessionToDb(from, session);
                        await twilioMessageServices.sendTextMessage(from, `What is the amount you would like to withdraw via Match2Pay? (Minimum amount: $10)`);
                        return;
                    }
                    else if (['dashboard_section_option_withdraw_whishMoney'].includes(buttonPayload || msg?.toLowerCase())) {
                        const whishMoney = paymentGateways.find(gateway => gateway.uniqueName === 'whishMoney');
                        if (!whishMoney) {
                            await twilioMessageServices.sendTextMessage(from, `❌ Whish Money withdrawal option is not available at the moment.`);
                            session.step = 'dashboard-withdraw-options'; // Ensure step is reset
                            await _saveSessionToDb(from, session);
                            return;
                        }

                        session.data.selectedPaymentGateway = whishMoney._id;
                        session.data.selectedPaymentGatewayName = 'whishMoney';
                        session.step = 'dashboard-withdraw-amount';
                        await _saveSessionToDb(from, session);
                        await twilioMessageServices.sendTextMessage(from, `What is the amount you would like to withdraw via Whish Money? (Minimum amount: $10)`);
                        return;
                    }
                    else if (['dashboard_section_option_withdraw_go_back'].includes(buttonPayload || msg?.toLowerCase())) {
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        return await twilioMessageServices.mainListTempMessage(from);
                    }
                    else {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Invalid withdrawal option. Please select a valid payment method.`);
                        return;
                    }
                }
                else if (session.step === 'dashboard-withdraw-amount') {
                    const amount = parseFloat(msg.replace(/[^\d.]/g, ''));
                    if (isNaN(amount) || amount < 10) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Please enter a valid amount (minimum $10).`);
                        return;
                    }

                    session.data.withdrawAmount = amount;

                    // Route to the appropriate next step based on payment method
                    if (session.data.selectedPaymentGatewayName === 'match2pay') {
                        session.step = 'dashboard-withdraw-match2pay-address';
                        await _saveSessionToDb(from, session);
                        await twilioMessageServices.goBackTempMessage(from, `Please enter your destination address for Match2Pay withdrawal:`);
                        return;
                    }
                    else if (session.data.selectedPaymentGatewayName === 'whishMoney') {
                        session.step = 'dashboard-withdraw-wishmoney-phone';
                        await _saveSessionToDb(from, session);
                        await twilioMessageServices.sendTextMessage(from, `Please enter the phone number to receive the Whish Money withdrawal:`);
                        return;
                    }
                }

                // Match2Pay specific flow
                else if (session.step === 'dashboard-withdraw-match2pay-address') {
                    if (!msg || msg.trim().length < 5) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Please enter a valid destination address.`);
                        return;
                    }

                    session.data.destinationAddress = msg.trim();
                    await processWithdrawalTransaction(from, session);
                    return;
                }

                // WishMoney specific flow
                else if (session.step === 'dashboard-withdraw-wishmoney-phone') {
                    if (!msg || msg.trim().length < 4) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Please enter a valid phone number.`);
                        return;
                    }

                    session.data.phoneNumber = msg.trim();
                    await processWithdrawalTransaction(from, session);
                    return;
                }

                // NOTE CREATE ACCOUNT FLOW
                else if (
                    buttonPayload === 'menu_list_create_trading_account' ||
                    msg?.toLowerCase() === 'menu_list_create_trading_account'
                ) {
                    session.step = 'create_trading_account_section';
                    await _saveSessionToDb(from, session);
                    return twilioMessageServices.createTradingAccountTempMessage(from);
                }

                // NOTE CREATE DEMO ACCOUNT
                else if (['create_trading_account_section_demo',].includes(buttonPayload || msg?.toLowerCase())) {
                    session.step = 'account-create-demo-name';
                    await _saveSessionToDb(from, session);
                    await twilioMessageServices.sendTextMessage(from, `Let’s start! Please tell me a name for your *demo account* (1/2).`);
                }

                else if (session.step === 'account-create-demo-name') {
                    if (!msg || msg.trim().length < 2) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Name too short. Please enter at least 2 characters.`);
                    } else {
                        session.data.account_demo_name = msg.trim();
                        session.step = 'account-create-demo-balance';
                        await _saveSessionToDb(from, session);
                        await twilioMessageServices.sendTextMessage(from,
                            `Great! Now enter the *starting balance* for “${session.data.account_demo_name}” ` +
                            `(2/2). Example: 100`
                        );
                    }
                }

                else if (session.step === 'account-create-demo-balance') {
                    const amount = parseFloat(msg);
                    if (Number.isNaN(amount) || amount <= 0) {
                        await twilioMessageServices.goBackTempMessage(from, `🤔 We need a positive number for your balance. Let's try again!`);
                    } else {
                        const { account_demo_name: name } = session.data;
                        try {
                            await crmApiServices.createTradingAccount(from, 'demo', {
                                name,
                                balance: amount,
                            });
                            session.step = 'main-menu';
                            await _saveSessionToDb(from, session);
                            await twilioMessageServices.goBackTempMessage(from,
                                `🎉 Woohoo! Your demo account *"${name}"* has been created with a balance of *$${amount}*! Ready to start trading?`
                            );
                            // await twilioMessageServices.createTradingAccountTempMessage(from);
                            return;
                        } catch (error) {
                            await twilioMessageServices.goBackTempMessage(from,
                                `❌ ${error?.message ?? 'Failed to create demo account. Please try again later.'}`
                            );
                            // await twilioMessageServices.createTradingAccountTempMessage(from);
                            return;
                        }
                    }
                }

                // NOTE CREATE REAL ACCOUNT
                else if (['create_trading_account_section_real'].includes(buttonPayload || msg?.toLowerCase())) {
                    session.step = 'account-create-real-name';
                    await _saveSessionToDb(from, session);
                    await twilioMessageServices.sendTextMessage(from, `Let’s start! Please enter a *name* for your real account (1/2).`);
                }

                else if (session.step === 'account-create-real-name') {
                    const name = msg?.trim();
                    if (!name || name.length < 2) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ Name too short. Please enter at least 2 characters.`);
                    } else {
                        session.data.account_real_name = name;
                        session.step = 'account-create-real-product';
                        await _saveSessionToDb(from, session);

                        return twilioMessageServices.createTradingAccountRealProductTempMessage(from);
                    }
                }

                else if (session.step === 'account-create-real-product') {
                    const productPayload = buttonPayload || msg?.toLowerCase()?.trim();
                    const products = await crmApiServices.getAvailableProducts(from);
                    if (!products || products.length === 0) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ No products available for real account creation. Please try again later.`);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        // return await twilioMessageServices.mainListTempMessage(from);
                        return;
                    }
                    const normalise = str => (str || '').toLowerCase().trim();
                    const productCodes = products.reduce((acc, p) => {
                        const n = normalise(p.name);
                        const d = normalise(p.description);

                        if (['standard', 'standard account', 'Standard Account'].includes(n) ||
                            ['standard', 'standard account', 'Standard Account'].includes(d)) {
                            acc.standard = p._id;
                        }

                        if (['raw', 'raw spread', 'raw-spread', 'Raw Spread'].includes(n) ||
                            ['raw', 'raw spread', 'raw-spread', 'Raw Spread'].includes(d)) {
                            acc.raw = p._id;
                        }

                        return acc;
                    }, { standard: undefined, raw: undefined });

                    const { standard: StandardCode, raw: RawSpreadCode } = productCodes;
                    if (!StandardCode || !RawSpreadCode) {
                        await twilioMessageServices.goBackTempMessage(from, `❌ No valid products found for real account creation. Please try again later.`);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        // return await twilioMessageServices.mainListTempMessage(from);
                        return;
                    }

                    const productMap = {
                        create_trading_account_section_real_product_standard_account: {
                            crmCode: StandardCode,
                            label: 'Standard Account',
                        },
                        create_trading_account_section_real_product_raw_spread: {
                            crmCode: RawSpreadCode,
                            label: 'Raw-Spread Account',
                        },
                    };

                    const selected = productMap[productPayload];
                    if (!selected) {
                        await twilioMessageServices.goBackTempMessage(from,
                            `❌ Invalid choice. Please tap one of the buttons or reply with “Standard” or “Raw Spread”.`
                        );
                    } else {
                        const { account_real_name: name } = session.data;
                        try {
                            await crmApiServices.createTradingAccount(from, 'real', {
                                name,
                                productId: selected.crmCode,
                            });

                            session.step = 'main-menu';
                            await _saveSessionToDb(from, session);

                            await twilioMessageServices.goBackTempMessage(from,
                                `✅ Your real trading account *“${name}”* *(${selected.label})* has been created successfully.\n` +
                                `You’ll receive the credentials by email shortly.`
                            );
                            // await twilioMessageServices.createTradingAccountTempMessage(from);
                            return;
                        } catch (error) {
                            console.error('Real account creation error:', error);
                            session.step = 'main-menu';
                            await _saveSessionToDb(from, session);
                            await twilioMessageServices.goBackTempMessage(from,
                                `❌ ${error?.message ?? 'Failed to create real account. Please try again later.'}`
                            );
                            // await twilioMessageServices.createTradingAccountTempMessage(from);
                            return;
                        }
                    }
                }

                else if (['create_trading_account_section_go_back'].includes(buttonPayload || msg?.toLowerCase())) {
                    session.step = 'main-menu';
                    await _saveSessionToDb(from, session);
                    return await twilioMessageServices.mainListTempMessage(from);
                }

                // NOTE REFER AND EARN FLOW
                else if (['menu_list_refer_and_earn'].includes(buttonPayload || msg?.toLowerCase())) {
                    try {
                        const referralLink = await crmApiServices.getReferalLink(from);
                        if (referralLink) {
                            // Extract referral code from the link or generate one
                            const referralCode = referralLink.split('/').pop() || referralLink.split('=').pop() || 'REF123';

                            // TODO: Replace with your actual WhatsApp Business number
                            const whatsappBusinessNumber = process.env.TWILIO_WHATSAPP_NUMBER || '+1234567890';

                            // Create WhatsApp join link with referral code
                            const whatsappJoinLink = `https://wa.me/${whatsappBusinessNumber}?text=Hi%20BBCorp!%20I%20want%20to%20join%20with%20referral%20code:%20${referralCode}`;

                            const referralMessage = `🤝 *Refer and Earn Program!*\n\n` +
                                `Share these links with your friends to earn rewards:\n\n` +
                                `📎 *Website Referral Link:*\n${referralLink}\n\n` +
                                `💬 *WhatsApp Join Link:*\n${whatsappJoinLink}\n\n` +
                                `🎁 *Your Referral Code:* \`${referralCode}\`\n\n` +
                                `✨ *How it works:*\n` +
                                `• Share the WhatsApp link with friends\n` +
                                `• They click and join our WhatsApp channel\n` +
                                `• Their referral code is automatically applied\n` +
                                `• You both earn rewards when they start trading!\n\n` +
                                `📱 When your friends click the WhatsApp link, they'll be directed to our WhatsApp channel and can signup instantly with your referral code!`;

                            await twilioMessageServices.goBackTempMessage(from, referralMessage);
                        } else {
                            await twilioMessageServices.goBackTempMessage(from, `❌ Unable to generate referral link at the moment. Please try again later.`);
                        }
                        return;
                    } catch (error) {
                        console.error("Error fetching referral link:", error);
                        await twilioMessageServices.goBackTempMessage(from, `❌ Error fetching your referral link. Please try again later.`);
                    }
                    return;
                }

                // NOTE HISTORY FLOW
                else if (['menu_list_history', 'history'].includes(buttonPayload || msg?.toLowerCase())) {
                    try {
                        const history = await crmApiServices.getHistory(from);
                        if (history && history?.transactions?.length > 0) {
                            // const historyMessage = history?.transactions?.map((item, index) => {
                            //     return `${index + 1}. ${item.type} - ${item.status} - ${item.amount} ${item.currencyName} on ${new Date(item.createdAt).toLocaleDateString()} ${new Date(item.createdAt).toLocaleTimeString()}`;
                            // }).join('\n');
                            // await twilioMessageServices.sendTextMessage(from, `📜 Your Transaction History:\n\n${historyMessage}`);
                            const historyMessage = history?.transactions?.map((item, index) => {
                                return {
                                    sn: index + 1,
                                    // date: `${new Date(item.createdAt).toLocaleDateString()} ${new Date(item.createdAt).toLocaleTimeString()}`,
                                    date: item.createdAt ? item.createdAt.split('T')[0] : 'N/A',
                                    type: item.type,
                                    status: item.status,
                                    amount: `$${item.amount}`,
                                }
                            });
                            if (historyMessage && historyMessage.length > 0) {

                                const awaitingMessage = `📜 Your Transaction History is being prepared...`;
                                await twilioMessageServices.sendTextMessage(from, awaitingMessage);

                                const user = await userServices.find({ whatsappPhone: from });
                                const userName = user?.firstName || "there";

                                const imageData = {
                                    accountHolderName: userName,
                                    transactionHistory: historyMessage,
                                };
                                await twilioMessageServices.sendTransactionFile(from, imageData, '');
                                await new Promise(resolve => setTimeout(resolve, 3000));
                                const historyText = `📜 Your Transaction History has been sent as a file.`;
                                return await twilioMessageServices.goBackTempMessage(from, historyText);
                            } else {
                                await twilioMessageServices.goBackTempMessage(from, `📜 No transaction history found.`);
                                return;
                            }

                            // await twilioMessageServices.sendTextMessage(from, `📜 Your Transaction History:\n\n${historyMessage}`);
                            // return await twilioMessageServices.goBackTempMessage(from, `Go back to the main menu.`);

                        }
                        return await twilioMessageServices.goBackTempMessage(from, `📜 No transaction history found.`);
                    } catch (error) {
                        console.error("Error fetching history:", error);
                        return await twilioMessageServices.goBackTempMessage(from, `❌ Error fetching your transaction history. Please try again later.`);
                    }
                }

                // NOTE HOW TO USE FLOW
                else if (['menu_list_how_to_use'].includes(buttonPayload || msg?.toLowerCase())) {
                    // Enhanced how to use message with AI and template information
                    const detectedLanguage = await aiAssistant.detectLanguage(msg || '');

                    const howToUseMessage = detectedLanguage === 'arabic'
                        ? `📖 *دليل الاستخدام - BBCorp WhatsApp Bot*\n\n` +
                        `🤖 *الذكاء الاصطناعي المدمج:*\n` +
                        `يمكنك التحدث معي بلغتك المفضلة:\n` +
                        `• العربية: "أريد إيداع 100 دولار"\n` +
                        `• English: "Check my balance"\n` +
                        `• हिंदी: "मेरा बैलेंस दिखाओ" (English response)\n\n` +

                        `💰 *العمليات المالية:*\n` +
                        `• إيداع: "إيداع 50 دولار باستخدام wishmoney"\n` +
                        `• سحب: "سحب 25 دولار إلى match2pay"\n` +
                        `• تحويل: "تحويل 30 دولار إلى user@email.com"\n` +
                        `• الرصيد: "أظهر رصيدي"\n\n` +

                        `📱 *إدارة الحساب:*\n` +
                        `• تسجيل دخول: "تسجيل الدخول email@test.com password123"\n` +
                        `• إنشاء حساب: "إنشاء حساب تجريبي اسمه Test"\n` +
                        `• معلومات الحساب: "معلومات حسابي"\n` +
                        `• التحقق: "فحص التحقق"\n\n` +

                        `🎯 *الأوامر السريعة:*\n` +
                        `• القائمة: "القائمة"\n` +
                        `• المساعدة: "أحتاج مساعدة"\n` +
                        `• الخروج: "تسجيل خروج"\n` +
                        `• الإحالة: "ربح من الإحالة"\n\n` +

                        `🔘 *أزرار القوالب:*\n` +
                        `يمكنك أيضاً استخدام الأزرار التفاعلية التي تظهر في المحادثة.\n\n` +

                        `🌐 *دعم متعدد اللغات:*\n` +
                        `النظام يفهم العربية، الإنجليزية، والهندية تلقائياً.\n\n` +

                        `📞 *الدعم:*\n` +
                        `للمساعدة الإضافية، اكتب "دعم" أو "support"`
                        : `📖 *How to Use - BBCorp WhatsApp Bot*\n\n` +
                        `🤖 *AI Assistant Features:*\n` +
                        `You can talk to me in your preferred language:\n` +
                        `• Arabic: "أريد إيداع 100 دولار"\n` +
                        `• English: "Check my balance"\n` +
                        `• Hindi: "मेरा बैलेंस दिखाओ" (English response)\n\n` +

                        `💰 *Financial Operations:*\n` +
                        `• Deposit: "Deposit 50 USD using wishmoney"\n` +
                        `• Withdraw: "Withdraw 25 USD to match2pay"\n` +
                        `• Transfer: "Transfer 30 USD to user@email.com"\n` +
                        `• Balance: "Show my balance"\n\n` +

                        `📱 *Account Management:*\n` +
                        `• Login: "Login email@test.com password123"\n` +
                        `• Create Account: "Create demo account named Test"\n` +
                        `• Account Info: "My account info"\n` +
                        `• Verification: "Check verification"\n\n` +

                        `🎯 *Quick Commands:*\n` +
                        `• Menu: "Show menu"\n` +
                        `• Support: "Need help"\n` +
                        `• Logout: "Logout"\n` +
                        `• Referral: "Refer and earn"\n\n` +

                        `🔘 *Template Buttons:*\n` +
                        `You can also use the interactive buttons that appear in the chat.\n\n` +

                        `🌐 *Multi-Language Support:*\n` +
                        `The system automatically detects Arabic, English, and Hindi.\n\n` +

                        `📞 *Support:*\n` +
                        `For additional help, type "support" or "مساعدة"`;

                    await twilioMessageServices.goBackTempMessage(from, howToUseMessage);
                    return;
                }

                // NOTE SUPPORT FLOW
                else if (['menu_list_support', 'support'].includes(buttonPayload || msg?.toLowerCase())) {
                    // send support message
                    const supportMessage = `📞 For support, please contact us at:\n` +
                        `- *Email*:support@gmail.com\n` +
                        `- *Phone*: +1234567890\n` +
                        `- *WhatsApp*: +1234567890\n\n` +
                        `Our support team is available 24/7 to assist you with any issues or questions you may have.`;

                    session.step = 'main-menu';
                    await _saveSessionToDb(from, session);
                    await twilioMessageServices.goBackTempMessage(from, supportMessage);
                    // await twilioMessageServices.mainListTempMessage(from);
                    return;
                }

                // NOTE VIEW ACCOUNTS FLOW
                else if (['dashboard_section_option_view_account'].includes(buttonPayload || msg?.toLowerCase())) {
                    try {
                        const realAccounts = await crmApiServices.getAccounts(from, 'real') || [];
                        const demoAccounts = await crmApiServices.getAccounts(from, 'demo') || [];

                        console.log("Real Accounts:", realAccounts);

                        let accountsMessage = "🏦 Your Accounts:\n\n";
                        accountsMessage += "Real Accounts:\n";
                        if (realAccounts.length > 0) {
                            accountsMessage += realAccounts.map((acc, i) =>
                                `${i + 1}. ${acc.name || 'N/A'}: $${acc.balance || 0}`).join('\n') + "\n\n";

                            accountsMessage += `Total Real Balance: $${realAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)}\n\n`;
                        } else {
                            accountsMessage += "📂 No real accounts found.\n\n";
                        }

                        accountsMessage += "Demo Accounts:\n";
                        if (demoAccounts.length > 0) {
                            accountsMessage += demoAccounts.map((acc, i) =>
                                `${i + 1}. ${acc.name || 'N/A'}: ${acc.balance || 0}`).join('\n') + "\n\n";
                            accountsMessage += `Total Demo Balance:$${demoAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)}`;
                        } else {
                            accountsMessage += "📂 No demo accounts found.";
                        }

                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        await twilioMessageServices.goBackTempMessage(from, accountsMessage);
                        // await twilioMessageServices.mainListTempMessage(from);
                        return;
                    } catch (error) {
                        console.error("Error fetching accounts:", error);
                        session.step = 'main-menu';
                        await _saveSessionToDb(from, session);
                        await twilioMessageServices.goBackTempMessage(from, `❌ Error fetching your accounts. Please try again later.`);
                        // await twilioMessageServices.mainListTempMessage(from);
                        return


                    }
                }

                // Handle unknown commands/messages when not in a specific flow step
                else if (!buttonPayload && msg) {
                    // Only handle text messages that are not button payloads
                    const user = await userServices.find({ whatsappPhone: from });
                    if (user) {
                        const loginRes = await crmApiServices.login(from, user.email, user.password);
                        if (!loginRes.token) {
                            return await twilioMessageServices.authTempate(from);
                        } else {
                            session.step = 'main-menu';
                            await _saveSessionToDb(from, session);
                            return await twilioMessageServices.mainListTempMessage(from);
                        }
                    }

                    await twilioMessageServices.goBackTempMessage(from, `❓ Sorry, I didn't understand that or your session may have expired. Please restart.`);
                    session.step = 'language-selection';
                    await _saveSessionToDb(from, session);
                    return;
                }

                // Handle unrecognized button payloads
                else if (buttonPayload) {
                    console.log(`Unhandled button payload: ${buttonPayload}`);
                    await twilioMessageServices.goBackTempMessage(from, `❓ That option isn't available right now. Please try again or restart by typing 'hi'.`);
                    return;
                }

            } catch (error) {
                console.error("Error processing message:", error);
                await twilioMessageServices.sendTextMessage(from, ERROR_MESSAGES.GENERIC);
                session.step = 'main-menu';
                await _saveSessionToDb(from, session);
                return await twilioMessageServices.mainListTempMessage(from);
            }
            return;
        } catch (error) {
            console.error("Critical error in whatsappMessage:", error);
            return next(apiError.internal('An unexpected error occurred'));
        }
    }
}

export default new userController();


// Helper method to download media files with better error handling
async function _downloadMediaFile(mediaUrl, fileName) {
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
            timeout: 15000, // Add timeout
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
        throw new Error('Failed to download media file');
    }
}

// Helper method to get file extension
async function _getFileExtension(contentType) {
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

// Helper method to process KYC documents with improved error handling
async function _processKycDocuments(from) {
    try {
        const session = await _getSessionFromDb(from);

        if (!session || !session.data) {
            await twilioMessageServices.goBackTempMessage(from, `❌ Session data is missing. Please restart the KYC process by typing "hi".`);
            return false;
        }

        if (!session.data.identityPath) {
            await twilioMessageServices.goBackTempMessage(from, `❌ ID document is missing. Please upload your ID document.`);
            return false;
        }
        const agreements = await crmApiServices.getAgreements(from);

        if (agreements && agreements.length === 0) {
            await twilioMessageServices.goBackTempMessage(from, `❌ You must accept at least one agreement before submitting your KYC profile.`);
            return false;
        }

        try {


            const profilePayload = {
                birthday: new Date(session.data.dob).toISOString(),
                city: session.data.city,
                country: session.data.country,
                postalCode: session.data.postalCode,
                street: session.data.street,
                identityPath: session.data.identityPath,
                utilityPath: session.data.utilityPath,
                acceptedAgreements: agreements.map(agreement => agreement._id) || [],
            };

            console.log(`Submitting KYC profile for ${from}:`, profilePayload);
            await crmApiServices.submitKycProfile(from, profilePayload);

            await twilioMessageServices.goBackTempMessage(from, `✅ Your documents and profile information have been uploaded successfully. please wait for our team to review your KYC profile.`);
            return true;
        } catch (error) {
            console.error("Error submitting KYC profile:", error);
            await twilioMessageServices.goBackTempMessage(from, `❌ Profile submission failed: ${error.message || 'Please check your information and try again.'}`);
            return false;
        }
    } catch (error) {
        console.error("Error processing KYC documents:", error);
        await twilioMessageServices.goBackTempMessage(from, `❌ KYC submission failed. Please try again later.`);
        return false;
    }
}


// Helper method to save session to database with better error handling
async function _saveSessionToDb(whatsappPhone, session) {
    try {
        if (!whatsappPhone || !session || !session.step) {
            console.error('Invalid session data for', whatsappPhone);
            return false;
        }

        const existingSession = await prisma.userSession.findFirst({
            where: { whatsappPhone }
        });

        let updatedData = {
            step: session.step,
            userFlow: session.userFlow || 'whatsapp-template',
            data: JSON.stringify(session.data || {}),
        }
        if (session.language) {
            updatedData.language = session.language;
        }

        if (existingSession) {
            await prisma.userSession.update({
                where: { id: existingSession.id },
                data: updatedData
            });
        } else {
            await prisma.userSession.create({
                data: {
                    whatsappPhone,
                    ...updatedData
                }
            });
        }

        return true;
    } catch (error) {
        console.error('Error saving user session:', error);
        return false;
    }
}

// Helper method to get session from database with better error handling
async function _getSessionFromDb(whatsappPhone) {
    try {
        const session = await prisma.userSession.findFirst({
            where: { whatsappPhone }
        });

        if (session) {
            let parsedData = {};
            try {
                parsedData = JSON.parse(session.data || '{}');
            } catch (e) {
                console.error('Error parsing session data:', e);
            }

            return {
                step: session.step,
                data: parsedData
            };
        }

        return null;
    } catch (error) {
        console.error('Error fetching user session:', error);
        return null;
    }
}

// Helper method to validate email
function _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Helper method to validate date format MM/DD/YYYY
function _isValidDate(dateStr) {
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) return false;

    const parts = dateStr.split('/');
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (month < 1 || month > 12) return false;

    if (day < 1 || day > 31) return false;

    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear) return false;

    const date = new Date(year, month - 1, day);
    return date.getMonth() === month - 1 && date.getDate() === day && date.getFullYear() === year;
}

async function processDepositTransaction(from, session) {
    try {
        let payload = {
            wallet: session.data.walletId,
            transactionType: "deposit",
            amount: session.data.depositAmount,
            paymentGateway: session.data.selectedPaymentGateway
        };

        if (session.data.selectedPaymentGatewayName === 'bankTransfer') {
            // Add bank transfer specific fields
            payload.bankName = session.data.bankName;
            payload.bankAddress = session.data.bankAddress;
            payload.swiftCode = session.data.swiftCode;
            payload.beneficiaryAccount = session.data.beneficiaryAccount;
        }

        const response = await crmApiServices.createTransaction(from, payload);

        if (session.data.selectedPaymentGatewayName === 'match2pay') {
            return await twilioMessageServices.goBackTempMessage(from,
                `🎉 Your deposit request of *$${session.data.depositAmount}* has been created successfully.\n\n` +
                `📱 *Ready to complete your payment?* Just using this link:\n${response.url}\n\n` +
                `⏱️ This link will be active for 10 minutes - quick and easy!`
            );
            // return await twilioMessageServices.goBackTempMessage(from, `Your deposit request of *$${session.data.depositAmount}* has been created successfully.\n\nPlease complete your payment using this link:\n${response.url} `);
        }
        else if (session.data.selectedPaymentGatewayName === 'whishMoney') {
            return await twilioMessageServices.goBackTempMessage(from,
                `🎉 Your deposit request of *$${session.data.depositAmount}* has been created successfully.\n\n` +
                `📱 *Ready to complete your payment?* Just using this link:\n${response.url}\n\n` +
                `⏱️ This link will be active for 10 minutes - quick and easy!`
            );
            // return await twilioMessageServices.goBackTempMessage(from, `Your deposit request of *$${session.data.depositAmount}* has been created successfully.\n\nPlease complete your payment using this link:\n${response.url}`);
        }
        else if (session.data.selectedPaymentGatewayName === 'bankTransfer') {
            // Send bank transfer instructions
            return await twilioMessageServices.goBackTempMessage(from,
                `Your deposit request of $${session.data.depositAmount} has been created successfully.\n\nPlease transfer the amount to the following bank details:\n\n` +
                `Bank Name: ${session.data.bankName}\n` +
                `Bank Address: ${session.data.bankAddress}\n` +
                `SWIFT Code: ${session.data.swiftCode}\n` +
                `Beneficiary Account: ${session.data.beneficiaryAccount}\n\n`);
        }

        return await twilioMessageServices.goBackTempMessage(from, `😕 Invalid payment gateway selected. Please try again.`);

    } catch (error) {
        console.error('Error processing deposit:', error);
        return await twilioMessageServices.goBackTempMessage(from, `😕 ${error.message} ` || `😕 We encountered a small hiccup with your deposit request. Let's try again in a moment.`);
    }
}


async function processWithdrawalTransaction(from, session) {
    try {
        let payload = {
            wallet: session.data.walletId,
            transactionType: "withdrawal",
            amount: session.data.withdrawAmount,
            paymentGateway: session.data.selectedPaymentGateway
        };

        // Add payment method specific fields
        if (session.data.selectedPaymentGatewayName === 'match2pay') {
            payload.destinationAddress = session.data.destinationAddress;
        }
        else if (session.data.selectedPaymentGatewayName === 'whishMoney') {
            payload.phoneNumber = session.data.phoneNumber;
            payload.paymentMethod = "WhishToWhish";
        }
        else if (session.data.selectedPaymentGatewayName === 'bankTransfer') {
            payload.bankName = session.data.bankName;
            payload.bankAddress = session.data.bankAddress;
            payload.swiftCode = session.data.swiftCode;
            payload.beneficiaryAccount = session.data.beneficiaryAccount;
        }

        // Call API to process withdrawal
        const response = await crmApiServices.createTransaction(from, payload);

        // Send confirmation message
        return await twilioMessageServices.goBackTempMessage(
            from,
            `✅ Your withdrawal request of *$${session.data.withdrawAmount}* via *${session.data.selectedPaymentGatewayName}* has been submitted successfully.\n\nYou will be notified when the withdrawal is processed.`
        );

        // return await twilioMessageServices.goBackTempMessage(from, '');
    } catch (error) {
        console.error('Error processing withdrawal:', error);
        return await twilioMessageServices.goBackTempMessage(
            from,
            `❌ ${error.message || 'There was an error processing your withdrawal request. Please try again later.'}`
        );
    }
}
