import userServices from './user';
import { smartTranslate } from './language';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();


const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+96178709578';
const client = require('twilio')(accountSid, authToken);


// 📊 Dashboard  
// 💵 Deposit
// 📄 History
// 🔁 Transfer to Account 
// 📈 Create Trading Acc. 
// 💰 Withdraw
// 👥 Refer & Earn  
// ❓ How to Use 
// 🛎 Support

const twilioMessageServices = {

    async languageTempMessage(phoneNumber) {
        return await commonTempMessage(phoneNumber, 'HX1367f4acbcf93c2ad3fb8601995ab554');
    },

    async authTempate(phoneNumber) {
        const language = await getUserLanguage(phoneNumber);
        if (language && language === 'arabic') {
            return await commonTempMessage(phoneNumber, 'HXc38e4199248bc027729cf418e4cdee1b');
        }
        return await commonTempMessage(phoneNumber, 'HXc38e4199248bc027729cf418e4cdee1b');
    },

    async signupConfirmationTemp(phoneNumber, data) {
        const language = await getUserLanguage(phoneNumber);
        if (language && language === 'arabic') {
            return await commonTempMessage(phoneNumber, 'HX14d70e4802a3f85ffb116100c1e938a0', { "1": data.firstName, "2": data.lastName, "3": data.email, "4": data.phone, "5": data.password });
        }
        return await commonTempMessage(phoneNumber, 'HX14d70e4802a3f85ffb116100c1e938a0', { "1": data.firstName, "2": data.lastName, "3": data.email, "4": data.phone, "5": data.password });
    },

    async sendTextMessage(phoneNumber, body) {
        try {
            const language = await getUserLanguage(phoneNumber);
            if (language && language === 'arabic') {
                body = await smartTranslate(body);
            }
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

            const language = await getUserLanguage(phoneNumber);
            if (language && language === 'arabic') {
                return await commonTempMessage(phoneNumber, 'HX126311b0d08344a38a93a20c1ad293cb', { "1": user.name ? `${user.name}` : "friend 👋", });
            }
            return await commonTempMessage(phoneNumber, 'HX126311b0d08344a38a93a20c1ad293cb', { "1": user.name ? `${user.name}` : "friend 👋", });

        } catch (e) {
            console.error('Error sending main menu message:', e);
            throw new Error('Failed to send main menu message');
        }
    },

    kycProcessStartTempMessage: async (phoneNumber, status = "incomplete ") => {
        try {
            const user = await userServices.find({ whatsappPhone: phoneNumber });
            let statusMessage = status === "rejected" ? "we need to update some information" : "let's complete your verification";

            const language = await getUserLanguage(phoneNumber);
            if (language && language === 'arabic') {
                statusMessage = await smartTranslate(statusMessage);
                return await commonTempMessage(phoneNumber, 'HX1d56f3a15ada4a9466e919b57e5d2877', { "1": user.name ? `${user.name}` : "there", "2": statusMessage });
            }
            return await commonTempMessage(phoneNumber, 'HX1d56f3a15ada4a9466e919b57e5d2877', { "1": user.name ? `${user.name}` : "there", "2": statusMessage });
        } catch (e) {
            console.error('Error sending KYC process start message:', e);
            throw new Error('Failed to send KYC process start message');
        }
    },

    skipKycProcessTempMessage: async (phoneNumber) => {
        try {

            const language = await getUserLanguage(phoneNumber);
            if (language && language === 'arabic') {
                return await commonTempMessage(phoneNumber, 'HXd6d8a5fb7b014f9f46d4075895c0b4bb');
            }
            return await commonTempMessage(phoneNumber, 'HXd6d8a5fb7b014f9f46d4075895c0b4bb');

        } catch (e) {
            console.error('Error sending skip KYC process message:', e);
            throw new Error('Failed to send skip KYC process message');
        }
    },

    createTradingAccountTempMessage: async (phoneNumber) => {
        const language = await getUserLanguage(phoneNumber);
        if (language && language === 'arabic') {
            return await commonTempMessage(phoneNumber, 'HX5fb229f372cdb25bd1da1ab5762c1843');
        }
        return await commonTempMessage(phoneNumber, 'HX5fb229f372cdb25bd1da1ab5762c1843')
    },
    createTradingAccountRealProductTempMessage: async (phoneNumber) => {
        const language = await getUserLanguage(phoneNumber);
        if (language && language === 'arabic') {
            return await commonTempMessage(phoneNumber, 'HX179a563f47584e91aeca3d53cdbc97d2');
        }
        return await commonTempMessage(phoneNumber, 'HX179a563f47584e91aeca3d53cdbc97d2')
    },

    transferFromTempMessage: async (phoneNumber) => {
        const language = await getUserLanguage(phoneNumber);
        if (language && language === 'arabic') {
            return await commonTempMessage(phoneNumber, 'HXc9241b04659c42f59d154d28545788dc');
        }
        return await commonTempMessage(phoneNumber, 'HXc9241b04659c42f59d154d28545788dc')
    },

    deshboardSectionTempMessage: async (phoneNumber, message) => {
        const language = await getUserLanguage(phoneNumber);
        if (language && language === 'arabic') {
            message = await smartTranslate(message);
            return await commonTempMessage(phoneNumber, 'HX5a25e660f1dc51e69a5e2b34793894aa', { "1": message });
        }
        return await commonTempMessage(phoneNumber, 'HX5a25e660f1dc51e69a5e2b34793894aa', { "1": message });
    },

    deshboardDepositTempMessage: async (phoneNumber) => {
        const language = await getUserLanguage(phoneNumber);
        if (language && language === 'arabic') {
            return await commonTempMessage(phoneNumber, 'HXfc58800ea19cd24998f733c2aa24d48b');
        }
        return await commonTempMessage(phoneNumber, 'HXfc58800ea19cd24998f733c2aa24d48b')
    },

    deshboardWithdrawTempMessage: async (phoneNumber, balance) => {
        const language = await getUserLanguage(phoneNumber);
        if (language && language === 'arabic') {
            return await commonTempMessage(phoneNumber, 'HX031b1adc333611b6b832378d4dd5f835', { "1": String(balance || 0) });
        }
        return await commonTempMessage(phoneNumber, 'HX031b1adc333611b6b832378d4dd5f835', { "1": String(balance || 0) });
    },

    transferConfirmationTempMessage: async (phoneNumber, amount, availableBalance, source, destination) => {
        const language = await getUserLanguage(phoneNumber);
        if (language && language === 'arabic') {
            return await commonTempMessage(phoneNumber, 'HX188eb2c8ee56d0cb9f46aef032546bd0', { "1": String(amount || 0), "2": String(availableBalance || 0), "3": source, "4": destination });
        }
        return await commonTempMessage(phoneNumber, 'HX188eb2c8ee56d0cb9f46aef032546bd0', { "1": String(amount || 0), "2": String(availableBalance || 0), "3": source, "4": destination });
    },

    goBackTempMessage: async (phoneNumber, errorMessage) => {

        const language = await getUserLanguage(phoneNumber);
        if (language && language === 'arabic') {
            errorMessage = await smartTranslate(errorMessage);
            return await commonTempMessage(phoneNumber, 'HX8b2c14c6e90544e2c30b0ea102b2b669', { "1": errorMessage });
        }

        const contentSid = 'HX8b2c14c6e90544e2c30b0ea102b2b669';
        return await commonTempMessage(phoneNumber, contentSid, { "1": errorMessage });
    }




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

async function getUserLanguage(phoneNumber) {
    try {
        const session = await prisma.userSession.findFirst({ where: { whatsappPhone: phoneNumber }, select: { language: true } });
        return session ? session.language : null;
    } catch (e) {
        console.error('Error fetching user language:', e);
        throw new Error('Failed to fetch user language');
    }
}