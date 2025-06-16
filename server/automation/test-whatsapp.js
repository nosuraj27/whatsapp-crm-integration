// const accountSid = 'SK1ac9a4e0f966ed29d3f36b22db08e20c';
// const accountSecret = '9QHJn986ziZ46K0gH3Eh9E04ptkPAAFi';
// const authToken = 'c3bffaca6e5acd38b7635a4b8e7c3790';
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

import twilioMessageServices from '../api/services/twilioMessage';



(async () => {


    try {

        // const message = await client.messages.create({
        //     from: 'whatsapp:+96178709578',
        //     to: 'whatsapp:+918340434976',
        //     contentSid: 'HXbe93992433eeae396dbb8325cbebed92',
        //     // body: 'Hello from Twilio WhatsApp',

        // });
        // await twilioMessageServices.sendTextMessage('+918340434976', 'Hello from Twilio WhatsApp');
        // await twilioMessageServices.mainMenubarTempMessage('+918340434976');

    } catch (error) {
        console.error("Error :==>", error);

    }
})
    ()