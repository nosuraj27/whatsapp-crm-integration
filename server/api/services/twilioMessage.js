import { skip } from '@prisma/client/runtime/library';
import userServices from './user';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+96178709578';
const client = require('twilio')(accountSid, authToken);


const twilioMessageServices = {

    async languageTempMessage(phoneNumber) {
        try {
            const message = await client.messages.create({
                from: `whatsapp:${twilioNumber}`,
                to: `whatsapp:${phoneNumber}`,
                contentSid: 'HX9cd115fb7920268e4281ecb76b72e0ea',
                // contentSid: 'HXc9241b04659c42f59d154d28545788dc',
            });
            console.log('Message sent! SID:', message.sid);
            return message.sid;
        } catch (e) {
            console.error('Error sending language selection message:', e);
            throw new Error('Failed to send language selection message');

        }
    },

    async authTempate(phoneNumber) {
        return await commonTempMessage(phoneNumber, 'HXad7316d48adb1ce3dd5ffa8b8c7e5e11');
    },

    async signupConfirmationTemp(phoneNumber, data) {
        // If your template has variables, pass them here
        return client.messages.create({
            from: `whatsapp:${twilioNumber}`,
            to: `whatsapp:${phoneNumber}`,
            contentSid: 'HX14d70e4802a3f85ffb116100c1e938a0', // bbcorp_signup_confirm
            contentVariables: JSON.stringify({
                "1": data.firstName,
                "2": data.lastName,
                "3": data.email,
                "4": data.phone,
                "5": data.password
            })
        });
    },

    async sendTextMessage(phoneNumber, body) {
        try {
            const message = await client.messages.create({
                from: `whatsapp:${twilioNumber}`,
                to: `whatsapp:${phoneNumber}`,
                body,
            });
            console.log('Message sent! SID:', message.sid);
            return message.sid;
        } catch (e) {
            console.error('Error sending text message:', e);
            throw new Error('Failed to send text message');
        }
    },

    mainListTempMessage: async (phoneNumber) => {
        try {
            const user = await userServices.find({ whatsappPhone: phoneNumber });

            const message = await client.messages.create({
                from: `whatsapp:${twilioNumber}`,
                to: `whatsapp:${phoneNumber}`,
                contentSid: 'HX102c1b867daf302179f75dc40c8f1be9',
                contentVariables: JSON.stringify({
                    "1": user.name ? `${user.name} 👋` : "friend 👋",
                })

            });
            console.log('Message sent! SID:', message.sid);
            return message.sid;
        } catch (e) {
            console.error('Error sending main menu message:', e);
            throw new Error('Failed to send main menu message');
        }
    },

    kycProcessStartTempMessage: async (phoneNumber, status = "incomplete ") => {
        try {
            const user = await userServices.find({ whatsappPhone: phoneNumber });

            const statusMessage = status === "rejected" ? "we need to update some information" : "let's complete your verification";

            const message = await client.messages.create({
                from: `whatsapp:${twilioNumber}`,
                to: `whatsapp:${phoneNumber}`,
                contentSid: 'HX1d56f3a15ada4a9466e919b57e5d2877',
                contentVariables: JSON.stringify({
                    "1": user.name ? `${user.name}` : "there",
                    "2": statusMessage
                })
            });
            console.log('Message sent! SID:', message.sid);
            return message.sid;
        } catch (e) {
            console.error('Error sending KYC process start message:', e);
            throw new Error('Failed to send KYC process start message');
        }
    },

    skipKycProcessTempMessage: async (phoneNumber) => {
        try {

            const message = await client.messages.create({
                from: `whatsapp:${twilioNumber}`,
                to: `whatsapp:${phoneNumber}`,
                contentSid: 'HXd6d8a5fb7b014f9f46d4075895c0b4bb',

            });
            console.log('Message sent! SID:', message.sid);
            return message.sid;
        } catch (e) {
            console.error('Error sending skip KYC process message:', e);
            throw new Error('Failed to send skip KYC process message');
        }
    },

    createTradingAccountTempMessage: async (phoneNumber) => {
        let contentSid = 'HX98cd7d761dd81939957695dfbb292f73';
        return await commonTempMessage(phoneNumber, contentSid)
    },
    createTradingAccountRealProductTempMessage: async (phoneNumber) => {
        let contentSid = 'HXb5814ea9bb70ef0fd410ef50cdc59e47';
        return await commonTempMessage(phoneNumber, contentSid)
    },

    transferFromTempMessage: async (phoneNumber) => {
        const contentSid = 'HXc9241b04659c42f59d154d28545788dc';
        return await commonTempMessage(phoneNumber, contentSid)
    },

    deshboardSectionTempMessage: async (phoneNumber) => {
        const contentSid = 'HX67dd7cb44b6ac08260e1d2f02a15aaaf';
        return await commonTempMessage(phoneNumber, contentSid)
    },

    deshboardDepositTempMessage: async (phoneNumber) => {
        const contentSid = 'HX3a23b5c1947262a0d5a25eba61a1ca2e';
        return await commonTempMessage(phoneNumber, contentSid)
    },

    deshboardWithdrawTempMessage: async (phoneNumber, balance) => {
        const contentSid = 'HXfdb137555f8de5dfb8c8a6556888b60f';
        return await commonTempMessage(phoneNumber, contentSid, { "1": String(balance || 0) });
    },

    transferConfirmationTempMessage: async (phoneNumber, amount, availableBalance, source, destination) => {
        const contentSid = 'HX188eb2c8ee56d0cb9f46aef032546bd0';
        return await commonTempMessage(phoneNumber, contentSid, { "1": String(amount || 0), "2": String(availableBalance || 0), "3": source, "4": destination });
    },





};

export default twilioMessageServices;


async function commonTempMessage(phoneNumber, contentSid, contentVariables = {}) {
    try {
        const message = await client.messages.create({
            from: `whatsapp:${twilioNumber}`,
            to: `whatsapp:${phoneNumber}`,
            contentSid,
            contentVariables: JSON.stringify(contentVariables)
        });
        console.log('Message sent! SID:', message.sid);
        return message.sid;
    } catch (e) {
        console.error('Error sending common template message:', e);
        throw new Error('Failed to send common template message');
    }
}