import userServices from './user';
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

// const baseUrl = 'https://cfcrm-api.onrender.com';
const baseUrl = 'https://crm-api.bbcorp.trade';

const crmApiServices = {
    async signup(whatsappPhone, { name, email, password, phoneNumber }) {
        console.log('CRM API Signup:', { whatsappPhone, name, email, password, phoneNumber });
        try {
            const res = await axios.post(
                `${baseUrl}/api/client/auth/signup/partner/undefined`,
                {
                    email,
                    name,
                    password,
                    phoneNumber,
                    // postalCode: '91',
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': process.env.CRM_API_KEY,
                    },
                }
            );
            const checkUser = await userServices.find({ whatsappPhone: whatsappPhone });
            if (checkUser) {
                await userServices.update(
                    { id: checkUser.id },
                    {
                        whatsappPhone: whatsappPhone,
                        phone: phoneNumber,
                        firstName: name.split(' ')[0],
                        lastName: name.split(' ').slice(1).join(' ') || '',
                        email,
                        password,
                        name,
                    }
                );
            } else {
                await userServices.create({
                    whatsappPhone: whatsappPhone,
                    phone: phoneNumber,
                    firstName: name.split(' ')[0],
                    lastName: name.split(' ').slice(1).join(' ') || '',
                    email,
                    password,
                    name,
                });
            }
            return res.data.msg || '✅ Signup successful! Check email.';
        } catch (e) {
            console.error('Error during signup:', e?.response?.data);
            throw new Error('❌ Signup failed: ' + (e?.response?.data?.msg || e.message));
        }
    },

    async login(whatsappPhone, email, password) {
        try {
            if (!email || !password) return { error: '❌ Email and password are required.' };
            // console.log('CRM API Login:', { whatsappPhone, email, password });
            const res = await axios.post(
                `${baseUrl}/api/client/auth/signin`,
                { email, password },
                { headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.CRM_API_KEY } }
            );

            // console.log('Login response:', JSON.stringify(res.data, null, 2));
            if (res.data.token) {
                const checkUser = await userServices.find({ whatsappPhone: whatsappPhone });

                let userObj = {
                    whatsappPhone,
                    email,
                    password,
                    name: res.data.user.name,
                    firstName: res.data.user.name.split(' ')[0],
                    lastName: res.data.user.name.split(' ').slice(1).join(' ') || '',
                    phone: '',
                    token: res.data.token,
                    code: res.data.user.code || '',
                }

                if (!checkUser) {
                    await userServices.create(userObj);
                } else {
                    await userServices.update(
                        { id: checkUser.id },
                        userObj
                    );
                }

                return { token: res.data.token, msg: res.data };
            }
            return { error: '❌ Login failed: ' };
        } catch (e) {
            console.error('Error during login:', e?.response?.data);
            // throw new Error('❌ Login failed: ' + (e?.response?.data?.msg || e.message));
            return { error: '❌ Login failed: ' + (e?.response?.data?.msg || e.message) };
        }
    },

    async submitKycProfile(whatsappPhone, { birthday, city, country, postalCode, street }) {
        try {

            const token = await getToken(whatsappPhone);
            const res = await axios.post(
                `${baseUrl}/api/client/agreements/profile-info`,
                { birthday, city, country, postalCode, street },
                { headers: { "x-auth-token": token, 'x-api-key': process.env.CRM_API_KEY } }
            );
            // console.log('KYC Profile Submission Response:', JSON.stringify(res.data, null, 2));
            return res.data;
        } catch (e) {
            console.error('Error submitting KYC profile:', e?.response);
            throw new Error(e?.response?.data?.error || e?.response?.data?.message || '❌ KYC profile submission failed.');
        }
    },

    async uploadKycDocuments(whatsappPhone, { identityPath, utilityPath }) {
        try {
            if (!identityPath || typeof identityPath !== 'string' || !fs.existsSync(identityPath)) {
                throw new Error(`❌ Identity document path is invalid or missing: ${identityPath}`);
            }

            const token = await getToken(whatsappPhone);
            const form = new FormData();
            form.append('identity', fs.createReadStream(identityPath));

            if (utilityPath && typeof utilityPath === 'string' && fs.existsSync(utilityPath)) {
                form.append('utilityBill', fs.createReadStream(utilityPath));
            } else {
                form.append('utilityBill', Buffer.from(''), { filename: 'utilityBill.jpg' });
            }

            const res = await axios.post(
                `${baseUrl}/api/client/agreements/upload-documents`,
                form,
                // { headers: { ...form.getHeaders(), "x-auth-token": token, 'x-api-key': process.env.CRM_API_KEY } }
                { headers: { ...form.getHeaders(), "x-auth-token": token, 'x-api-key': process.env.CRM_API_KEY } }
            );
            return res.data;
        } catch (e) {
            console.error('Error uploading KYC documents:', e.response?.data || e.message);
            throw new Error(e.response?.data?.message || '❌ Document upload failed.');
        }
    },

    async getAgreements(whatsappPhone) {
        try {
            const token = await getToken(whatsappPhone);
            const res = await axios.get(
                `${baseUrl}/api/client/agreements/get-agreements`,
                { headers: { "x-auth-token": token, 'x-api-key': process.env.CRM_API_KEY } }
            );
            return res.data.contract || [];
        } catch (e) {
            throw new Error('❌ Failed to fetch agreements.');
        }
    },

    async acceptAgreement(whatsappPhone, agreementId) {
        try {
            const token = await getToken(whatsappPhone);
            const res = await axios.post(
                `${baseUrl}/api/client/agreements/accept-agreement`,
                { agreementId },
                { headers: { "x-auth-token": token, 'x-api-key': process.env.CRM_API_KEY } }
            );
            return res.data;
        } catch (e) {
            throw new Error('❌ Agreement acceptance failed.');
        }
    },

    async completeKyc(whatsappPhone) {
        try {
            const token = await getToken(whatsappPhone);
            const res = await axios.post(
                `${baseUrl}/api/client/agreements/complete-submission`,
                {},
                { headers: { "x-auth-token": token, 'x-api-key': process.env.CRM_API_KEY } }
            );
            return res.data;
        } catch (e) {
            throw new Error('❌ KYC completion failed.');
        }
    },

    async getAccounts(whatsappPhone, type = 'real') {
        try {
            const token = await getToken(whatsappPhone);
            const res = await axios.get(
                `${baseUrl}/api/client/trading_account?type=${type}&page=1&pageSize=10&sortBy=-createdAt`,
                { headers: { "x-auth-token": token, 'x-api-key': process.env.CRM_API_KEY } }
            );
            return res.data.accounts || [];
        } catch (e) {
            throw new Error('❌ Failed to fetch accounts.');
        }
    },

    async refreshToken(token) {
        try {
            const res = await axios.post(
                `${baseUrl}/api/client/auth/refresh-token`,
                { accessToken: token }
            );
            return res.data;
        } catch (e) {
            throw new Error('❌ Token refresh failed.');
        }
    },

    async checkProfileVerificationStatus(whatsappPhone) {

        try {

            const token = await getToken(whatsappPhone);
            const res = await axios.get(
                `${baseUrl}/api/client/profile/verification-check`,
                { headers: { "x-auth-token": token } }
            );
            return res.data;
        } catch (e) {
            throw new Error('❌ Verification status check failed.');
        }
    },

    async checkKycVerification(whatsappPhone) {
        try {
            const token = await getToken(whatsappPhone);
            const res = await axios.get(
                `${baseUrl}/api/client/agreements/check-verification`,
                { headers: { "x-auth-token": token } }
            );
            return res.data;
        } catch (e) {
            throw new Error('❌ Verification check failed.');
        }
    },

    async getReferalLink(whatsappPhone) {
        try {
            const user = await userServices.find({ whatsappPhone: whatsappPhone });
            if (!user || !user.token) {
                throw new Error('User not found or token not available');
            }
            let link = `${baseUrl}/api/client/auth/referral-link?code=${user.code}`;
            return link;
        } catch (e) {
            throw new Error('❌ Failed to fetch referral link.');
        }
    },

    async createTradingAccount(whatsappPhone, type, obj) {
        try {
            const token = await getToken(whatsappPhone);

            if (type == 'demo' || type == 'real') {
                obj.currency = "6776f0a8e874c31f8d47719c"
                obj.leverage = "67880cdb0e955c305ed1ded9"
            }

            const res = await axios.post(
                `${baseUrl}/api/client/trading_account/${type}`,
                obj,
                { headers: { "x-auth-token": token, 'x-api-key': process.env.CRM_API_KEY } }
            );
            return res.data;
        } catch (e) {
            throw new Error(e.response?.data?.message || 'Error in create account');
        }
    },

    async getWallet(whatsappPhone) {
        try {
            const token = await getToken(whatsappPhone);
            const res = await axios.get(
                `${baseUrl}/api/client/wallets`,
                { headers: { "x-auth-token": token } }
            );
            return res.data;
        } catch (e) {
            throw new Error(e.response?.data?.message || 'Error in get wallet.');
        }
    },
    async getPaymentGateway(whatsappPhone) {
        try {
            const token = await getToken(whatsappPhone);
            const res = await axios.get(
                `${baseUrl}/api/client/payment_gateway?type=deposit`,
                { headers: { "x-auth-token": token } }
            );
            return res.data;
        } catch (e) {
            throw new Error(e.response?.data?.message || 'Error in get wallet.');
        }
    },


    async createTransaction(whatsappPhone, payload) {
        try {
            const token = await getToken(whatsappPhone);
            const res = await axios.post(
                `${baseUrl}/api/client/transactions`,
                payload,
                { headers: { "x-auth-token": token } }
            );
            return res.data;
        } catch (e) {
            throw new Error(e.response?.data?.message || 'Error in create transaction.');
        }
    },

    async getHistory(whatsappPhone) {

        try {
            const token = await getToken(whatsappPhone);
            const res = await axios.get(
                `${baseUrl}/api/client/transactions?page=1&pageSize=50`,
                { headers: { "x-auth-token": token } }
            );
            return res.data;
        } catch (e) {
            console.log("jlkjkl", e)
            throw new Error(e.response?.data?.message || 'Error in get wallet.');
        }
    },
    async createTransferFromAccount(whatsappPhone, payload) {
        try {
            const token = await getToken(whatsappPhone);
            const res = await axios.post(
                `${baseUrl}/api/client/transfers/to`,
                payload,
                { headers: { "x-auth-token": token } }
            );
            return res.data;
        } catch (e) {
            throw new Error(e.response?.data?.message || 'Error in transfer funds.');
        }
    },

    async createTransferFromWallet(whatsappPhone, payload) {
        try {
            const token = await getToken(whatsappPhone);
            const res = await axios.post(
                `${baseUrl}/api/client/transfers/from`,
                payload,
                { headers: { "x-auth-token": token } }
            );
            return res.data;
        } catch (e) {
            throw new Error(e.response?.data?.message || 'Error in transfer funds from.');
        }
    },


};

export default crmApiServices;


async function getToken(whatsappPhone) {
    try {
        const user = await userServices.find({ whatsappPhone: whatsappPhone });
        if (user) {
            const loginResponse = await crmApiServices.login(whatsappPhone, user.email, user.password);
            if (loginResponse.token) {
                await userServices.update(
                    { id: user.id },
                    { token: loginResponse.token }
                );
                return loginResponse.token;
            } else {
                throw new Error('Login failed, no token received');
            }
        } else {
            throw new Error('User not found or token not available');
        }
    } catch (error) {
        console.error('Error fetching token:', error);
        throw error;
    }
}