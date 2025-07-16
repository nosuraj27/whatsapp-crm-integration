// Enhanced AI Assistant for WhatsApp CRM Integration
import { PrismaClient } from '@prisma/client';
import crmApiServices from './crmApi.js';
import twilioMessageServices from './twilioMessage.js';
import userServices from './user.js';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

class AIAssistant {
    constructor() {
        this.supportedIntents = [
            'login', 'signup', 'dashboard', 'deposit', 'withdraw', 'transfer',
            'create_account', 'check_balance', 'history', 'kyc', 'refer_earn',
            'support', 'greeting', 'account_info', 'payment_methods',
            'check_verification', 'logout', 'menu', 'how_to_use'
        ];
    }

    // Detect language from message content
    async detectLanguage(message) {
        const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
        const hindiPattern = /[\u0900-\u097F]/;

        if (arabicPattern.test(message)) {
            return 'arabic';
        } else if (hindiPattern.test(message)) {
            return 'english'; // Hindi users follow English functionality
        } else {
            return 'english';
        }
    }

    // Quick access processor for natural language commands
    async processQuickAccess(message, session, from) {
        try {
            const detectedLanguage = await this.detectLanguage(message);
            const isAuthenticated = await this.checkAuthentication(from);

            console.log(`Quick access processing - Language: ${detectedLanguage}, Authenticated: ${isAuthenticated}`);

            // Analyze user intent using AI with fallback
            const analysis = await this.analyzeUserIntent(message, session, isAuthenticated);

            if (analysis.status === 'error') {
                // If AI analysis fails, try to provide helpful fallback
                console.warn('AI analysis failed, providing fallback response');

                // Check if it's a simple greeting
                if (/^(hi|hello|hey|hii|مرحبا|أهلا|हैलो|नमस्ते)$/i.test(message.toLowerCase().trim())) {
                    return await this.handleQuickGreeting({}, session, from, detectedLanguage);
                }

                // Check if it's a help request
                if (/(help|support|مساعدة|सहायता|how to use|كيفية الاستخدام)/i.test(message.toLowerCase())) {
                    return await this.handleQuickSupport({}, session, from, detectedLanguage);
                }

                return await twilioMessageServices.goBackTempMessage(
                    from,
                    '⚙️ We\'re currently experiencing an issue with our AI assistance. Please use the WhatsApp template feature for help at this time. Thank you for your understanding! 🙏'
                );
                return { handled: false, error: analysis.message };
                return { handled: false, error: analysis.message };
            }

            console.log('AI Analysis:', analysis);

            // Process the intent based on analysis
            return await this.executeIntent(analysis, session, from, detectedLanguage);

        } catch (error) {
            console.error('Quick access processing error:', error);
            return { handled: false, error: 'Failed to process quick access command' };
        }
    }

    // Check if user is authenticated
    async checkAuthentication(whatsappPhone) {
        try {
            const user = await userServices.find({ whatsappPhone });
            return user && user.token;
        } catch (error) {
            return false;
        }
    }

    // Execute the detected intent
    async executeIntent(analysis, session, from, language) {
        try {
            const { intent, params, needsAuth, hasCompleteInfo, confidence } = analysis;

            // Check confidence threshold
            if (confidence < 0.7) {
                return { handled: false, error: 'Low confidence in intent detection' };
            }

            // Check authentication requirement
            if (needsAuth && !(await this.checkAuthentication(from))) {
                const message = language === 'arabic'
                    ? 'يجب عليك تسجيل الدخول أولاً للوصول إلى هذه الميزة. يرجى تسجيل الدخول أو إنشاء حساب جديد.'
                    : '🔐 You need to login first to access this feature. Please login or create an account.';
                await twilioMessageServices.sendTextMessage(from, message);
                return { handled: true, success: false };
            }

            // Route to appropriate handler
            switch (intent) {
                case 'login':
                    return await this.handleQuickLogin(params, session, from, language);

                case 'signup':
                    return await this.handleQuickSignup(params, session, from, language);

                case 'deposit':
                    return await this.handleQuickDeposit(params, session, from, language);

                case 'withdraw':
                    return await this.handleQuickWithdraw(params, session, from, language);

                case 'transfer':
                    return await this.handleQuickTransfer(params, session, from, language);

                case 'dashboard':
                    return await this.handleQuickDashboard(params, session, from, language);

                case 'check_balance':
                    return await this.handleQuickBalance(params, session, from, language);

                case 'history':
                    return await this.handleQuickHistory(params, session, from, language);

                case 'kyc':
                    return await this.handleQuickKYC(params, session, from, language);

                case 'create_account':
                    return await this.handleQuickCreateAccount(params, session, from, language);

                case 'refer_earn':
                    return await this.handleQuickReferEarn(params, session, from, language);

                case 'support':
                    return await this.handleQuickSupport(params, session, from, language);

                case 'greeting':
                    return await this.handleQuickGreeting(params, session, from, language);

                case 'account_info':
                    return await this.handleQuickAccountInfo(params, session, from, language);

                case 'payment_methods':
                    return await this.handleQuickPaymentMethods(params, session, from, language);

                case 'check_verification':
                    return await this.handleQuickCheckVerification(params, session, from, language);

                case 'logout':
                    return await this.handleQuickLogout(params, session, from, language);

                case 'menu':
                    return await this.handleQuickMenu(params, session, from, language);

                case 'how_to_use':
                    return await this.handleQuickHowToUse(params, session, from, language);

                default:
                    return { handled: false, error: `Intent ${intent} not implemented` };
            }

        } catch (error) {
            console.error('Intent execution error:', error);
            return { handled: false, error: 'Failed to execute intent' };
        }
    }

    // Quick access handlers
    async handleQuickLogin(params, session, from, language) {
        try {
            if (params.email && params.password) {
                const loginResult = await crmApiServices.login(from, params.email, params.password);

                if (loginResult.error) {
                    await twilioMessageServices.goBackTempMessage(from, loginResult.error);
                    return { handled: true, success: false };
                }

                const message = language === 'arabic'
                    ? '✅ تم تسجيل الدخول بنجاح! مرحباً بك مرة أخرى.'
                    : '✅ Login successful! Welcome back.';
                await twilioMessageServices.sendTextMessage(from, message);

                // Update session and show main menu
                session.step = 'main-menu';
                await this.saveSession(from, session);
                await twilioMessageServices.mainListTempMessage(from);

                return { handled: true, success: true };
            } else {
                const message = language === 'arabic'
                    ? 'يرجى تقديم البريد الإلكتروني وكلمة المرور للدخول بسرعة. مثال: "تسجيل الدخول user@email.com password123"'
                    : 'Please provide both email and password for quick login. Example: "login user@email.com password123"';
                await twilioMessageServices.sendTextMessage(from, message);
                return { handled: true, success: false };
            }
        } catch (error) {
            console.error('Quick login error:', error);
            return { handled: false, error: error.message };
        }
    }

    async handleQuickSignup(params, session, from, language) {
        try {
            if (params.name && params.email && params.password && params.phone) {
                // Complete information provided - process immediately
                return await this.processCompleteSignup(params, session, from, language);
            } else {
                // Incomplete information - start signup flow and pre-fill what we have
                session.data = session.data || {};

                if (params.name) session.data.firstName = params.name.split(' ')[0];
                if (params.name && params.name.includes(' ')) session.data.lastName = params.name.split(' ').slice(1).join(' ');
                if (params.email) session.data.email = params.email;
                if (params.password) session.data.password = params.password;
                if (params.phone) session.data.phone = params.phone;

                // Start the signup flow from where we need info
                if (!params.name) {
                    session.step = 'signup-firstname';
                    await this.saveSession(from, session);

                    const message = language === 'arabic'
                        ? 'مرحباً! دعنا ننشئ حسابك. ما هو اسمك الأول؟'
                        : "Hi! Let's create your account. What's your first name?";
                    await twilioMessageServices.sendTextMessage(from, message);
                } else if (!params.email) {
                    session.step = 'signup-email';
                    await this.saveSession(from, session);

                    const message = language === 'arabic'
                        ? `رائع ${params.name}! ما هو عنوان بريدك الإلكتروني؟`
                        : `Great ${params.name}! What's your email address?`;
                    await twilioMessageServices.sendTextMessage(from, message);
                } else if (!params.password) {
                    session.step = 'signup-password';
                    await this.saveSession(from, session);

                    const message = language === 'arabic'
                        ? 'يرجى إنشاء كلمة مرور قوية لحسابك:'
                        : 'Please create a strong password for your account:';
                    await twilioMessageServices.sendTextMessage(from, message);
                } else if (!params.phone) {
                    session.step = 'signup-phone';
                    await this.saveSession(from, session);

                    const message = language === 'arabic'
                        ? 'أخيراً، ما هو رقم هاتفك؟'
                        : 'Finally, what\'s your phone number?';
                    await twilioMessageServices.sendTextMessage(from, message);
                }

                return { handled: true, success: false };
            }
        } catch (error) {
            console.error('Quick signup error:', error);
            await twilioMessageServices.goBackTempMessage(from, error.message);
            return { handled: true, success: false };
        }
    }

    async processCompleteSignup(params, session, from, language) {
        try {
            const signupData = {
                name: params.name,
                email: params.email,
                password: params.password,
                phoneNumber: params.phone,
                referralCode: session.data?.referralCode || 'BBCORP'
            };

            const result = await crmApiServices.signup(from, signupData);

            const message = language === 'arabic'
                ? `✅ تم إنشاء الحساب بنجاح! ${result}`
                : `✅ Account created successfully! ${result}`;
            await twilioMessageServices.sendTextMessage(from, message);

            session.step = 'main-menu';
            await this.saveSession(from, session);
            await twilioMessageServices.mainListTempMessage(from);

            return { handled: true, success: true };
        } catch (error) {
            console.error('Complete signup processing error:', error);
            await twilioMessageServices.goBackTempMessage(from, error.message);
            return { handled: true, success: false };
        }
    }

    async handleQuickDeposit(params, session, from, language) {
        try {
            if (params.amount && params.paymentMethod) {
                // Complete information provided - process immediately
                return await this.processCompleteDeposit(params, session, from, language);
            } else if (params.amount && !params.paymentMethod) {
                // Amount provided but no payment method - show payment options template
                const wallets = await crmApiServices.getWallet(from);
                if (!wallets || wallets.length === 0) {
                    const message = language === 'arabic'
                        ? '❌ لا توجد محافظ متاحة للإيداع. يرجى إنشاء محفظة أولاً.'
                        : '❌ No wallets available for deposit. Please create a wallet first.';
                    await twilioMessageServices.goBackTempMessage(from, message);
                    return { handled: true, success: false };
                }

                // Store the amount in session and set up for payment method selection
                session.data = session.data || {};
                session.data.walletId = wallets[0]._id;
                session.data.quickAccessAmount = params.amount; // Store for later use
                session.step = 'dashboard-deposit-options';
                await this.saveSession(from, session);

                const message = language === 'arabic'
                    ? `💰 رائع! تريد إيداع $${params.amount}. يرجى اختيار طريقة الدفع:`
                    : `💰 Great! You want to deposit $${params.amount}. Please select your payment method:`;

                // await twilioMessageServices.sendTextMessage(from, message);
                await twilioMessageServices.deshboardDepositTempMessage(from);
                return { handled: true, success: true };
            } else if (!params.amount && params.paymentMethod) {
                // Payment method provided but no amount - ask for amount
                const message = language === 'arabic'
                    ? `يرجى تحديد المبلغ الذي تريد إيداعه باستخدام ${params.paymentMethod}. (الحد الأدنى: $10)`
                    : `Please specify the amount you want to deposit using ${params.paymentMethod}. (Minimum: $10)`;
                await twilioMessageServices.sendTextMessage(from, message);

                // Set up session for amount input
                session.data = session.data || {};
                session.data.selectedPaymentGatewayName = params.paymentMethod;
                session.step = 'quick-deposit-amount-input';
                await this.saveSession(from, session);
                return { handled: true, success: false };
            } else {
                // No amount or payment method - show full deposit template
                session.step = 'dashboard-deposit-options';
                await this.saveSession(from, session);

                const message = language === 'arabic'
                    ? 'يرجى اختيار طريقة الدفع للإيداع:'
                    : 'Please select your payment method for deposit:';

                await twilioMessageServices.sendTextMessage(from, message);
                await twilioMessageServices.deshboardDepositTempMessage(from);
                return { handled: true, success: true };
            }
        } catch (error) {
            console.error('Quick deposit error:', error);
            await twilioMessageServices.goBackTempMessage(from, error.message);
            return { handled: true, success: false };
        }
    }

    async processCompleteDeposit(params, session, from, language) {
        try {
            // Get wallet info
            const wallets = await crmApiServices.getWallet(from);
            if (!wallets || wallets.length === 0) {
                const message = language === 'arabic'
                    ? '❌ لا توجد محافظ متاحة للإيداع. يرجى إنشاء محفظة أولاً.'
                    : '❌ No wallets available for deposit. Please create a wallet first.';
                await twilioMessageServices.goBackTempMessage(from, message);
                return { handled: true, success: false };
            }

            // Get payment gateways
            // const paymentGateways = await crmApiServices.getPaymentGateway(from);
            const paymentGateways = await crmApiServices.getPaymentGateway(from);
            if (!paymentGateways || paymentGateways.length === 0) {
                await twilioMessageServices.goBackTempMessage(from, `❌ No payment gateways are available at the moment. Please try again later.`);
                return { handled: true, success: false };
            }
            const gateway = paymentGateways.find(g =>
                g.uniqueName.toLowerCase() === params.paymentMethod.toLowerCase() ||
                g.uniqueName.toLowerCase().includes(params.paymentMethod.toLowerCase())
            );

            if (!gateway) {
                const message = language === 'arabic'
                    ? `❌ طريقة الدفع ${params.paymentMethod} غير متاحة.`
                    : `❌ Payment method ${params.paymentMethod} is not available.`;
                await twilioMessageServices.goBackTempMessage(from, message);
                return { handled: true, success: false };
            }

            // Process deposit
            const depositPayload = {
                wallet: wallets[0]._id,
                transactionType: "deposit",
                amount: params.amount,
                paymentGateway: gateway._id
            };

            const response = await crmApiServices.createTransaction(from, depositPayload);

            if (gateway.uniqueName === 'match2pay' && response.url) {
                await twilioMessageServices.goBackTempMessage(from,
                    `🎉 Your deposit request of *$${params.amount}* has been created successfully.\n\n` +
                    `📱 *Ready to complete your payment?* Just using this link:\n${response.url}\n\n` +
                    `⏱️ This link will be active for 10 minutes - quick and easy!`
                );
            } else if (gateway.uniqueName === 'whishMoney' && response.url) {
                await twilioMessageServices.goBackTempMessage(from,
                    `🎉 Your deposit request of *$${params.amount}* has been created successfully.\n\n` +
                    `📱 *Ready to complete your payment?* Just using this link:\n${response.url}\n\n` +
                    `⏱️ This link will be active for 10 minutes - quick and easy!`
                );
            } else {
                const message = language === 'arabic'
                    ? `✅ تم إنشاء طلب الإيداع بنجاح بمبلغ $${params.amount}.`
                    : `✅ Deposit request created successfully for $${params.amount}.`;
                await twilioMessageServices.sendTextMessage(from, message);
            }

            return { handled: true, success: true };
        } catch (error) {
            console.error('Complete deposit processing error:', error);
            await twilioMessageServices.goBackTempMessage(from, error.message);
            return { handled: true, success: false };
        }
    }

    async handleQuickDashboard(params, session, from, language) {
        try {
            const realAccounts = await crmApiServices.getAccounts(from, 'real') || [];
            const demoAccounts = await crmApiServices.getAccounts(from, 'demo') || [];
            const wallet = await crmApiServices.getWallet(from);
            const user = await userServices.find({ whatsappPhone: from });
            const userName = user?.firstName || "there";

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
                    amount: `$${acc.balance || 0}`
                }))
            };

            const waitMessage = language === 'arabic'
                ? '⏳ يرجى الانتظار بينما نجلب تفاصيل حسابك...'
                : '⏳ Please wait while we fetch your account details...';
            await twilioMessageServices.sendTextMessage(from, waitMessage);

            await twilioMessageServices.sendMediaFile(from, imageData, '');

            await new Promise(resolve => setTimeout(resolve, 2000));

            const welcomeMessage = language === 'arabic'
                ? `مرحباً بك في لوحة التحكم، ${userName}!`
                : `Welcome to your dashboard, ${userName}!`;
            await twilioMessageServices.deshboardSectionTempMessage(from, welcomeMessage);

            return { handled: true, success: true };
        } catch (error) {
            console.error('Quick dashboard error:', error);
            return { handled: false, error: error.message };
        }
    }

    async handleQuickBalance(params, session, from, language) {
        try {
            const wallet = await crmApiServices.getWallet(from);
            const balance = wallet && wallet.length > 0 ? wallet[0].balance : 0;

            const message = language === 'arabic'
                ? `💰 رصيد محفظتك الحالي: $${balance}`
                : `💰 Your current wallet balance: $${balance}`;
            await twilioMessageServices.sendTextMessage(from, message);

            return { handled: true, success: true };
        } catch (error) {
            console.error('Quick balance error:', error);
            return { handled: false, error: error.message };
        }
    }

    async handleQuickHistory(params, session, from, language) {
        try {
            const history = await crmApiServices.getHistory(from);
            const user = await userServices.find({ whatsappPhone: from });
            const userName = user?.firstName || "there";

            if (history && history.transactions && history.transactions.length > 0) {
                const imageData = {
                    accountHolderName: userName,
                    transactionHistory: history.transactions.map((item, index) => ({
                        sn: index + 1,
                        date: item.createdAt ? item.createdAt.split('T')[0] : 'N/A',
                        type: item.type,
                        status: item.status,
                        amount: `$${item.amount}`,
                    }))
                };

                const waitMessage = language === 'arabic'
                    ? '⏳ يرجى الانتظار بينما نجلب تاريخ المعاملات...'
                    : '⏳ Please wait while we fetch your transaction history...';
                await twilioMessageServices.sendTextMessage(from, waitMessage);

                await twilioMessageServices.sendTransactionFile(from, imageData, '');
            } else {
                const message = language === 'arabic'
                    ? '📄 لا توجد معاملات في التاريخ حتى الآن.'
                    : '📄 No transaction history found yet.';
                await twilioMessageServices.sendTextMessage(from, message);
            }

            return { handled: true, success: true };
        } catch (error) {
            console.error('Quick history error:', error);
            return { handled: false, error: error.message };
        }
    }

    async handleQuickKYC(params, session, from, language) {
        try {
            const message = language === 'arabic'
                ? '🔍 بدء عملية التحقق من الهوية...'
                : '🔍 Starting KYC verification process...';
            await twilioMessageServices.sendTextMessage(from, message);

            session.step = 'kyc-start';
            await this.saveSession(from, session);
            await twilioMessageServices.kycProcessStartTempMessage(from);

            return { handled: true, success: true };
        } catch (error) {
            console.error('Quick KYC error:', error);
            return { handled: false, error: error.message };
        }
    }

    async handleQuickCreateAccount(params, session, from, language) {
        try {
            if (params.type && params.name) {
                // Complete information provided - create account immediately
                return await this.processCompleteCreateAccount(params, session, from, language);
            } else if (params.type && !params.name) {
                // Type provided but no name - ask for account name
                const message = language === 'arabic'
                    ? `يرجى تقديم اسم للحساب ${params.type === 'demo' ? 'التجريبي' : 'الحقيقي'}:`
                    : `Please provide a name for your ${params.type} account:`;
                await twilioMessageServices.sendTextMessage(from, message);

                // Set up session for name input
                session.data = session.data || {};
                session.data.accountType = params.type;
                session.step = 'quick-create-account-name';
                await this.saveSession(from, session);
                return { handled: true, success: false };
            } else if (!params.type && params.name) {
                // Name provided but no type - show account type selection
                session.data = session.data || {};
                session.data.accountName = params.name;
                session.step = 'create-trading-account';
                await this.saveSession(from, session);

                const message = language === 'arabic'
                    ? `رائع! تريد إنشاء حساب باسم "${params.name}". يرجى اختيار نوع الحساب:`
                    : `Great! You want to create an account named "${params.name}". Please select account type:`;

                // await twilioMessageServices.sendTextMessage(from, message);
                await twilioMessageServices.createTradingAccountTempMessage(from);
                return { handled: true, success: true };
            } else {
                // No type or name - show full account creation template
                session.step = 'create-trading-account';
                await this.saveSession(from, session);

                const message = language === 'arabic'
                    ? 'يرجى اختيار نوع الحساب الذي تريد إنشاؤه:'
                    : 'Please select the type of account you want to create:';

                await twilioMessageServices.sendTextMessage(from, message);
                await twilioMessageServices.createTradingAccountTempMessage(from);
                return { handled: true, success: true };
            }
        } catch (error) {
            console.error('Quick create account error:', error);
            await twilioMessageServices.sendTextMessage(from, error.message);
            return { handled: true, success: false };
        }
    }

    async processCompleteCreateAccount(params, session, from, language) {
        try {
            const accountData = {
                name: params.name,
                balance: params.type === 'demo' ? 10000 : 0
            };

            const result = await crmApiServices.createTradingAccount(from, params.type, accountData);

            const message = language === 'arabic'
                ? `✅ تم إنشاء حساب ${params.type === 'demo' ? 'تجريبي' : 'حقيقي'} بنجاح: ${params.name}`
                : `✅ ${params.type === 'demo' ? 'Demo' : 'Real'} account created successfully: ${params.name}`;
            await twilioMessageServices.sendTextMessage(from, message);

            return { handled: true, success: true };
        } catch (error) {
            console.error('Complete create account processing error:', error);
            await twilioMessageServices.sendTextMessage(from, error.message);
            return { handled: true, success: false };
        }
    }

    async handleQuickWithdraw(params, session, from, language) {
        try {
            if (params.amount && params.paymentMethod) {
                // Complete information provided - process immediately
                return await this.processCompleteWithdraw(params, session, from, language);
            } else if (params.amount && !params.paymentMethod) {
                // Amount provided but no payment method - ask for payment method
                const message = language === 'arabic'
                    ? `يرجى تحديد طريقة السحب للمبلغ $${params.amount}. (match2pay أو wishmoney)`
                    : `Please specify the withdrawal method for $${params.amount}. (match2pay or wishmoney)`;
                await twilioMessageServices.sendTextMessage(from, message);

                // Set up session for payment method input
                session.data = session.data || {};
                session.data.withdrawAmount = params.amount;
                session.step = 'quick-withdraw-method-input';
                await this.saveSession(from, session);
                return { handled: true, success: false };
            } else if (!params.amount && params.paymentMethod) {
                // Payment method provided but no amount - ask for amount
                const message = language === 'arabic'
                    ? `يرجى تحديد المبلغ الذي تريد سحبه باستخدام ${params.paymentMethod}. (الحد الأدنى: $10)`
                    : `Please specify the amount you want to withdraw using ${params.paymentMethod}. (Minimum: $10)`;
                await twilioMessageServices.sendTextMessage(from, message);

                // Set up session for amount input
                session.data = session.data || {};
                session.data.selectedPaymentGatewayName = params.paymentMethod;
                session.step = 'quick-withdraw-amount-input';
                await this.saveSession(from, session);
                return { handled: true, success: false };
            } else {
                // No amount or payment method - show full withdraw template
                const wallets = await crmApiServices.getWallet(from);
                if (!wallets || wallets.length === 0) {
                    const message = language === 'arabic'
                        ? '❌ لا توجد محافظ متاحة للسحب. يرجى إنشاء محفظة أولاً.'
                        : '❌ No wallets available for withdrawal. Please create a wallet first.';
                    await twilioMessageServices.sendTextMessage(from, message);
                    return { handled: true, success: false };
                }

                const balance = (wallets[0]?.balance || 0).toFixed(3) || 0;
                session.step = 'dashboard-withdraw-options';
                await this.saveSession(from, session);

                const message = language === 'arabic'
                    ? 'يرجى اختيار طريقة السحب:'
                    : 'Please select your withdrawal method:';

                await twilioMessageServices.sendTextMessage(from, message);
                await twilioMessageServices.deshboardWithdrawTempMessage(from, balance);
                return { handled: true, success: true };
            }
        } catch (error) {
            console.error('Quick withdraw error:', error);
            await twilioMessageServices.goBackTempMessage(from, error.message);
            return { handled: true, success: false };
        }
    }

    async processCompleteWithdraw(params, session, from, language) {
        try {
            const wallet = await crmApiServices.getWallet(from);
            const balance = wallet && wallet.length > 0 ? wallet[0].balance : 0;

            if (params.amount > balance) {
                const message = language === 'arabic'
                    ? `❌ الرصيد الحالي ($${balance}) أقل من المبلغ المطلوب ($${params.amount}).`
                    : `❌ Your current balance ($${balance}) is less than the requested amount ($${params.amount}).`;
                await twilioMessageServices.goBackTempMessage(from, message);
                return { handled: true, success: false };
            }

            // Get payment gateways
            const paymentGateways = await crmApiServices.getPaymentGateway(from);
            const gateway = paymentGateways.find(g =>
                g.uniqueName.toLowerCase() === params.paymentMethod.toLowerCase() ||
                g.uniqueName.toLowerCase().includes(params.paymentMethod.toLowerCase())
            );

            if (!gateway) {
                const message = language === 'arabic'
                    ? `❌ طريقة السحب ${params.paymentMethod} غير متاحة.`
                    : `❌ Withdrawal method ${params.paymentMethod} is not available.`;
                await twilioMessageServices.goBackTempMessage(from, message);
                return { handled: true, success: false };
            }

            // Set up session for withdrawal processing
            session.data = session.data || {};
            session.data.walletId = wallet[0]._id;
            session.data.selectedPaymentGateway = gateway._id;
            session.data.selectedPaymentGatewayName = gateway.uniqueName;
            session.data.withdrawAmount = params.amount;

            // Ask for additional required info based on payment method
            if (gateway.uniqueName === 'match2pay') {
                session.step = 'dashboard-withdraw-match2pay-address';
                await this.saveSession(from, session);
                const message = language === 'arabic'
                    ? 'يرجى إدخال عنوان الوجهة لسحب Match2Pay:'
                    : 'Please enter your destination address for Match2Pay withdrawal:';
                await twilioMessageServices.goBackTempMessage(from, message);
            } else if (gateway.uniqueName === 'whishMoney') {
                session.step = 'dashboard-withdraw-wishmoney-phone';
                await this.saveSession(from, session);
                const message = language === 'arabic'
                    ? 'يرجى إدخال رقم الهاتف لاستلام سحب Whish Money:'
                    : 'Please enter the phone number to receive the Whish Money withdrawal:';
                await twilioMessageServices.sendTextMessage(from, message);
            }

            return { handled: true, success: true };
        } catch (error) {
            console.error('Complete withdraw processing error:', error);
            await twilioMessageServices.goBackTempMessage(from, error.message);
            return { handled: true, success: false };
        }
    }

    async handleQuickTransfer(params, session, from, language) {
        try {
            if (params.amount && params.from && params.to) {
                // Complete information provided - process immediately
                return await this.processCompleteTransfer(params, session, from, language);
            } else {
                // Incomplete information - guide to transfer template
                const message = language === 'arabic'
                    ? 'دعني أساعدك في التحويل. يرجى اختيار الحساب المصدر:'
                    : 'Let me help you with the transfer. Please select the source account:';
                await twilioMessageServices.sendTextMessage(from, message);

                // Set up transfer flow
                session.step = 'dashboard-transfer-select-source';
                session.data = session.data || {};
                await this.saveSession(from, session);

                // Get both wallets and accounts for source selection
                const wallets = await crmApiServices.getWallet(from);
                const accounts = await crmApiServices.getAccounts(from, 'real');

                if ((!wallets || wallets.length === 0) && (!accounts || accounts.length === 0)) {
                    const message = language === 'arabic'
                        ? '❌ لا توجد محافظ أو حسابات تداول متاحة.'
                        : '❌ You don\'t have any wallets or trading accounts available.';
                    await twilioMessageServices.goBackTempMessage(from, message);
                    return { handled: true, success: false };
                }

                // Store for reference
                session.data.wallets = wallets;
                session.data.accounts = accounts;
                await this.saveSession(from, session);

                // Build source account list
                let sourceAccountListMessage = `*Select Source Account*\n\n`;

                if (wallets && wallets.length > 0) {
                    wallets.forEach((wallet, index) => {
                        sourceAccountListMessage += `${index + 1}. *Wallet* - $${wallet.balance || 0}\n\n`;
                    });
                }

                let startIndex = (wallets && wallets.length) || 0;
                if (accounts && accounts.length > 0) {
                    accounts.forEach((acc, index) => {
                        sourceAccountListMessage += `${startIndex + index + 1}. ${acc?.name || ''}(*${acc?.client_login || 'Account'}*) - $${acc?.balance || 0}\n`;
                    });
                }

                sourceAccountListMessage += `\n\nPlease select a source account by replying with the number (e.g. "1").`;
                await twilioMessageServices.sendTextMessage(from, sourceAccountListMessage);

                return { handled: true, success: true };
            }
        } catch (error) {
            console.error('Quick transfer error:', error);
            await twilioMessageServices.goBackTempMessage(from, error.message);
            return { handled: true, success: false };
        }
    }

    async processCompleteTransfer(params, session, from, language) {
        try {
            // Implementation for complete transfer would go here
            // For now, redirect to template flow
            const message = language === 'arabic'
                ? 'التحويل المتقدم متاح عبر القائمة. دعني أوجهك:'
                : 'Advanced transfer is available through the menu. Let me guide you:';
            await twilioMessageServices.sendTextMessage(from, message);

            return await this.handleQuickTransfer({}, session, from, language);
        } catch (error) {
            console.error('Complete transfer processing error:', error);
            return { handled: false, error: error.message };
        }
    }

    async handleQuickReferEarn(params, session, from, language) {
        try {
            const referralLink = await crmApiServices.getReferalLink(from);
            if (referralLink) {
                const referralCode = referralLink.split('/').pop() || referralLink.split('=').pop() || 'REF123';
                const whatsappBusinessNumber = process.env.TWILIO_WHATSAPP_NUMBER || '+1234567890';
                const whatsappJoinLink = `https://wa.me/${whatsappBusinessNumber}?text=Hi%20BBCorp!%20I%20want%20to%20join%20with%20referral%20code:%20${referralCode}`;

                const message = language === 'arabic'
                    ? `🤝 *برنامج الإحالة والربح!*\n\n` +
                    `شارك هذه الروابط مع أصدقائك لكسب المكافآت:\n\n` +
                    `📎 *رابط الإحالة:*\n${referralLink}\n\n` +
                    `💬 *رابط WhatsApp:*\n${whatsappJoinLink}\n\n` +
                    `🎁 *كود الإحالة:* \`${referralCode}\`\n\n` +
                    `✨ كيف يعمل: شارك الروابط، أصدقاؤك ينضمون، تربحون معاً!`
                    : `🤝 *Refer and Earn Program!*\n\n` +
                    `Share these links with your friends to earn rewards:\n\n` +
                    `📎 *Website Referral Link:*\n${referralLink}\n\n` +
                    `💬 *WhatsApp Join Link:*\n${whatsappJoinLink}\n\n` +
                    `🎁 *Your Referral Code:* \`${referralCode}\`\n\n` +
                    `✨ Share the links, friends join, you both earn when they start trading!`;

                await twilioMessageServices.goBackTempMessage(from, message);
            } else {
                const message = language === 'arabic'
                    ? '❌ غير قادر على إنشاء رابط الإحالة في الوقت الحالي.'
                    : '❌ Unable to generate referral link at the moment.';
                await twilioMessageServices.goBackTempMessage(from, message);
            }

            return { handled: true, success: true };
        } catch (error) {
            console.error('Quick refer earn error:', error);
            const message = language === 'arabic'
                ? '❌ خطأ في جلب رابط الإحالة.'
                : '❌ Error fetching your referral link.';
            await twilioMessageServices.goBackTempMessage(from, message);
            return { handled: true, success: false };
        }
    }

    async handleQuickSupport(params, session, from, language) {
        try {
            const message = language === 'arabic'
                ? `📞 للحصول على الدعم، يرجى التواصل معنا:\n` +
                `- *البريد الإلكتروني*: support@gmail.com\n` +
                `- *الهاتف*: +1234567890\n` +
                `- *WhatsApp*: +1234567890\n\n` +
                `فريق الدعم متاح 24/7 لمساعدتك.`
                : `📞 For support, please contact us at:\n` +
                `- *Email*: support@gmail.com\n` +
                `- *Phone*: +1234567890\n` +
                `- *WhatsApp*: +1234567890\n\n` +
                `Our support team is available 24/7 to assist you.`;

            await twilioMessageServices.goBackTempMessage(from, message);
            return { handled: true, success: true };
        } catch (error) {
            console.error('Quick support error:', error);
            return { handled: false, error: error.message };
        }
    }

    async handleQuickGreeting(params, session, from, language) {
        try {
            const user = await userServices.find({ whatsappPhone: from });
            const userName = user?.firstName || "there";

            const message = language === 'arabic'
                ? `مرحباً ${userName}! 👋 أنا مساعدك الذكي لـ BBCorp. كيف يمكنني مساعدتك اليوم؟\n\nيمكنك أن تسأل عن:\n• الرصيد\n• الإيداع والسحب\n• إنشاء حساب\n• التاريخ\n• أو أي شيء آخر!`
                : `Hello ${userName}! 👋 I'm your AI assistant for BBCorp. How can I help you today?\n\nYou can ask about:\n• Balance\n• Deposit & Withdraw\n• Create Account\n• History\n• Or anything else!`;

            await twilioMessageServices.sendTextMessage(from, message);

            // Show appropriate menu
            if (await this.checkAuthentication(from)) {
                session.step = 'main-menu';
                await this.saveSession(from, session);
                await twilioMessageServices.mainListTempMessage(from);
            } else {
                await twilioMessageServices.authTempate(from);
            }

            return { handled: true, success: true };
        } catch (error) {
            console.error('Quick greeting error:', error);
            return { handled: false, error: error.message };
        }
    }

    async handleQuickAccountInfo(params, session, from, language) {
        try {
            const realAccounts = await crmApiServices.getAccounts(from, 'real') || [];
            const demoAccounts = await crmApiServices.getAccounts(from, 'demo') || [];

            let accountsMessage = language === 'arabic' ? "🏦 حساباتك:\n\n" : "🏦 Your Accounts:\n\n";

            accountsMessage += language === 'arabic' ? "الحسابات الحقيقية:\n" : "Real Accounts:\n";
            if (realAccounts.length > 0) {
                accountsMessage += realAccounts.map((acc, i) =>
                    `${i + 1}. ${acc.name || 'N/A'}: $${acc.balance || 0}`).join('\n') + "\n\n";
                const totalReal = realAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
                accountsMessage += language === 'arabic' ? `إجمالي الرصيد الحقيقي: $${totalReal}\n\n` : `Total Real Balance: $${totalReal}\n\n`;
            } else {
                accountsMessage += language === 'arabic' ? "📂 لا توجد حسابات حقيقية.\n\n" : "📂 No real accounts found.\n\n";
            }

            accountsMessage += language === 'arabic' ? "الحسابات التجريبية:\n" : "Demo Accounts:\n";
            if (demoAccounts.length > 0) {
                accountsMessage += demoAccounts.map((acc, i) =>
                    `${i + 1}. ${acc.name || 'N/A'}: $${acc.balance || 0}`).join('\n') + "\n\n";
                const totalDemo = demoAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
                accountsMessage += language === 'arabic' ? `إجمالي الرصيد التجريبي: $${totalDemo}` : `Total Demo Balance: $${totalDemo}`;
            } else {
                accountsMessage += language === 'arabic' ? "📂 لا توجد حسابات تجريبية." : "📂 No demo accounts found.";
            }

            await twilioMessageServices.goBackTempMessage(from, accountsMessage);
            return { handled: true, success: true };
        } catch (error) {
            console.error('Quick account info error:', error);
            const message = language === 'arabic'
                ? '❌ خطأ في جلب معلومات الحساب.'
                : '❌ Error fetching account information.';
            await twilioMessageServices.goBackTempMessage(from, message);
            return { handled: true, success: false };
        }
    }

    async handleQuickPaymentMethods(params, session, from, language) {
        try {
            const paymentGateways = await crmApiServices.getPaymentGateway(from);

            if (!paymentGateways || paymentGateways.length === 0) {
                const message = language === 'arabic'
                    ? '❌ لا توجد طرق دفع متاحة في الوقت الحالي.'
                    : '❌ No payment methods are available at the moment.';
                await twilioMessageServices.goBackTempMessage(from, message);
                return { handled: true, success: false };
            }

            const methodsList = paymentGateways.map((gateway, index) =>
                `${index + 1}. ${gateway.uniqueName}`
            ).join('\n');

            const message = language === 'arabic'
                ? `💳 طرق الدفع المتاحة:\n\n${methodsList}\n\nيمكنك استخدام أي من هذه الطرق للإيداع والسحب.`
                : `💳 Available Payment Methods:\n\n${methodsList}\n\nYou can use any of these methods for deposit and withdrawal.`;

            await twilioMessageServices.goBackTempMessage(from, message);
            return { handled: true, success: true };
        } catch (error) {
            console.error('Quick payment methods error:', error);
            const message = language === 'arabic'
                ? '❌ خطأ في جلب طرق الدفع.'
                : '❌ Error fetching payment methods.';
            await twilioMessageServices.goBackTempMessage(from, message);
            return { handled: true, success: false };
        }
    }

    async handleQuickCheckVerification(params, session, from, language) {
        try {
            const kycStatus = await crmApiServices.checkKycVerification(from);

            let statusMessage;
            if (kycStatus.status === 'approved') {
                statusMessage = language === 'arabic'
                    ? '✅ تم التحقق من هويتك بنجاح!'
                    : '✅ Your identity has been successfully verified!';
            } else if (kycStatus.status === 'pending') {
                statusMessage = language === 'arabic'
                    ? '⏳ التحقق من الهوية قيد المراجعة. يرجى الانتظار.'
                    : '⏳ Your identity verification is under review. Please wait.';
            } else if (kycStatus.status === 'rejected') {
                statusMessage = language === 'arabic'
                    ? '❌ تم رفض التحقق من الهوية. يرجى إعادة المحاولة.'
                    : '❌ Identity verification was rejected. Please try again.';
            } else {
                statusMessage = language === 'arabic'
                    ? '📋 لم تقم بالتحقق من هويتك بعد. هل تريد البدء؟'
                    : '📋 You haven\'t completed identity verification yet. Would you like to start?';
            }

            await twilioMessageServices.goBackTempMessage(from, statusMessage);

            if (kycStatus.status === 'rejected' || !kycStatus.status) {
                // Offer to start KYC process
                return await this.handleQuickKYC(params, session, from, language);
            }

            return { handled: true, success: true };
        } catch (error) {
            console.error('Quick check verification error:', error);
            const message = language === 'arabic'
                ? '❌ خطأ في فحص حالة التحقق.'
                : '❌ Error checking verification status.';
            await twilioMessageServices.goBackTempMessage(from, message);
            return { handled: true, success: false };
        }
    }

    async handleQuickLogout(params, session, from, language) {
        try {
            // Clear user data
            await userServices.deleteMany({ whatsappPhone: from });

            // Reset session
            session.step = 'language-selection';
            session.data = {};
            await this.saveSession(from, session);

            const message = language === 'arabic'
                ? 'تم تسجيل الخروج بنجاح. اكتب "Hi" للبدء مرة أخرى.'
                : 'You have been logged out successfully. Type "Hi" to start again.';

            await twilioMessageServices.sendTextMessage(from, message);
            await twilioMessageServices.languageTempMessage(from);

            return { handled: true, success: true };
        } catch (error) {
            console.error('Quick logout error:', error);
            const message = language === 'arabic'
                ? '❌ خطأ في تسجيل الخروج.'
                : '❌ Error during logout.';
            await twilioMessageServices.goBackTempMessage(from, message);
            return { handled: true, success: false };
        }
    }

    async handleQuickMenu(params, session, from, language) {
        try {
            const message = language === 'arabic'
                ? 'إليك القائمة الرئيسية:'
                : 'Here\'s the main menu:';

            await twilioMessageServices.sendTextMessage(from, message);

            // Show appropriate menu based on authentication
            if (await this.checkAuthentication(from)) {
                session.step = 'main-menu';
                await this.saveSession(from, session);
                await twilioMessageServices.mainListTempMessage(from);
            } else {
                await twilioMessageServices.authTempate(from);
            }

            return { handled: true, success: true };
        } catch (error) {
            console.error('Quick menu error:', error);
            return { handled: false, error: error.message };
        }
    }

    async handleQuickHowToUse(params, session, from, language) {
        try {
            const message = language === 'arabic'
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

            await twilioMessageServices.goBackTempMessage(from, message);
            return { handled: true, success: true };
        } catch (error) {
            console.error('Quick how to use error:', error);
            return { handled: false, error: error.message };
        }
    }

    // Helper method to save session
    async saveSession(whatsappPhone, session) {
        try {
            const prisma = new PrismaClient();

            const existingSession = await prisma.userSession.findFirst({
                where: { whatsappPhone }
            });

            const sessionData = {
                step: session.step,
                userFlow: session.userFlow || 'whatsapp-template',
                data: JSON.stringify(session.data || {}),
                language: session.language
            };

            if (existingSession) {
                await prisma.userSession.update({
                    where: { id: existingSession.id },
                    data: sessionData
                });
            } else {
                await prisma.userSession.create({
                    data: {
                        whatsappPhone,
                        ...sessionData
                    }
                });
            }

            await prisma.$disconnect();
            return true;
        } catch (error) {
            console.error('Error saving session:', error);
            return false;
        }
    }

    async analyzeUserIntent(message, session, isAuthenticated) {
        try {
            const detectedLanguage = await this.detectLanguage(message);

            // Try AI analysis first
            try {
                return await this.analyzeWithAI(message, session, isAuthenticated, detectedLanguage);
            } catch (error) {
                console.warn('AI analysis failed, falling back to pattern matching:', error.message);
                return { status: "error", message: "AI analysis failed, falling back to pattern matching." };
                // Fallback to pattern matching
                // return await this.analyzeWithPatterns(message, session, isAuthenticated, detectedLanguage);
            }

        } catch (error) {
            console.error('Intent analysis error:', error);
            return { status: "error", message: error.message || "Failed to analyze intent" };
        }
    }

    async analyzeWithAI(message, session, isAuthenticated, detectedLanguage) {

        const systemPrompt = `
                You are an intelligent multilingual assistant for a WhatsApp-based trading CRM system. 
                Analyze user messages in English, Hindi, or Arabic and extract intent and parameters.

                LANGUAGE DETECTION:
                - Arabic text: Use Arabic functionality
                - Hindi/English text: Use English functionality
                
                SUPPORTED LANGUAGES & EXAMPLES:
                English/Hindi: "login user@email.com password123", "deposit 100 USD using wishmoney"
                Arabic: "تسجيل الدخول user@email.com password123", "إيداع 100 دولار باستخدام wishmoney"

                Available intents and their requirements:
                1. greeting - Welcome messages (hi, hello, hey, हैलो, مرحبا)
                2. login - Login requests (login, sign in, تسجيل الدخول, लॉगिन) - Extract email and password
                3. signup - Registration requests (signup, register, إنشاء حساب, रजिस्टर) - Extract name, email, password, phone
                4. dashboard - View account overview (dashboard, لوحة التحكم, डैशबोर्ड) - needs auth
                5. deposit - Add money (deposit, إيداع, जमा) - Extract amount, payment method
                6. withdraw - Withdraw money (withdraw, سحب, निकालना) - Extract amount, payment method  
                7. transfer - Transfer between accounts (transfer, تحويل, स्थानांतरण) - Extract amount, from, to
                8. create_account - Create trading account (create account, إنشاء حساب, खाता बनाएं) - Extract type, name
                9. check_balance - Check balance (balance, رصيد, बैलेंस) - needs auth
                10. history - Transaction history (history, تاريخ, इतिहास) - needs auth
                11. kyc - KYC verification (kyc, verification, تحقق, सत्यापन) - needs auth
                12. refer_earn - Referral program (refer, إحالة, रेफर) - needs auth
                13. support - Help and support (help, support, مساعدة, सहायता)
                14. account_info - Account details (account info, معلومات الحساب, खाता जानकारी) - needs auth
                15. payment_methods - Payment options (payment methods, طرق الدفع, भुगतान विधि) - needs auth
                16. check_verification - Check KYC status (check verification, فحص التحقق, सत्यापन जांचें) - needs auth
                17. logout - Sign out (logout, تسجيل الخروج, लॉगआउट) - needs auth
                18. menu - Show main menu (menu, قائمة, मेनू)
                19. how_to_use - Usage guide and instructions (how to use, guide, help guide, كيفية الاستخدام, उपयोग गाइड)

                ENHANCED SMART PARSING RULES:
                
                LOGIN PATTERNS:
                - "login email@domain.com password123"
                - "sign in with user@email.com mypass"
                - "log me in user@test.com 12345"
                - "तसجيل الدخول user@email.com password"
                - "लॉगिन करें user@email.com password123"

                DEPOSIT PATTERNS:
                - "deposit 100 usdt using wishmoney"
                - "add 50 dollars via match2pay" 
                - "I want to deposit 10 USD using wishmoney"
                - "fund my account with 200 dollars via match2pay"
                - "put 75 usdt in my account using whish money"
                - "load 150 dollars with bank transfer"
                - "إيداع 100 دولار باستخدام wishmoney"
                - "100 डॉलर जमा करें wishmoney के साथ"

                SIGNUP PATTERNS:
                - "signup John Doe john@email.com password123 +1234567890"
                - "register with name John email john@test.com password abc123 phone +123456"
                - "create account John john@email.com pass123 +1234567890"
                - "إنشاء حساب جون john@email.com password123 +1234567890"

                CREATE ACCOUNT PATTERNS:
                - "create demo account named Test"
                - "make real account called MyAccount"
                - "إنشاء حساب تجريبي باسم Test"
                - "टेस्ट नाम से डेमो अकाउंट बनाएं"

                WITHDRAW PATTERNS:
                - "withdraw 100 USD using match2pay"
                - "take out 50 dollars via wishmoney"
                - "I want to withdraw 75 USDT using match2pay"
                - "cash out 200 dollars with wishmoney"
                - "سحب 100 دولار باستخدام match2pay"
                - "100 डॉलर निकालें wishmoney से"

                TRANSFER PATTERNS:
                - "transfer 100 from wallet to account"
                - "move 50 dollars from account to wallet"
                - "send 25 USD from my wallet to trading account"
                - "تحويل 100 دولار من المحفظة إلى الحساب"
                - "वॉलेट से अकाउंट में 100 डॉलर ट्रांसफर करें"

                BALANCE/INFO PATTERNS:
                - "show my balance", "what's my balance", "check balance"
                - "account info", "my accounts", "show accounts"
                - "payment methods", "how can I pay", "deposit options"
                - "verification status", "check kyc", "am I verified"
                - "عرض الرصيد", "معلومات الحساب", "طرق الدفع"
                - "बैलेंस दिखाएं", "खाता जानकारी", "भुगतान विधि"

                SUPPORT/MENU PATTERNS:
                - "help", "support", "need help", "contact support"
                - "menu", "main menu", "show options", "what can I do"
                - "refer", "referral", "invite friends", "earn money"
                - "logout", "sign out", "exit", "log me out"
                - "مساعدة", "قائمة", "إحالة", "تسجيل الخروج"
                - "सहायता", "मेनू", "रेफर", "लॉगआउट"

                GREETING PATTERNS:
                - "hi", "hello", "hey", "good morning", "good afternoon"
                - "مرحبا", "أهلا", "السلام عليكم"
                - "हैलो", "नमस्ते", "हाय"

                HOW TO USE PATTERNS:
                - "how to use", "usage guide", "help guide", "instructions"
                - "how does this work", "what can I do", "feature guide"
                - "كيفية الاستخدام", "دليل الاستخدام", "تعليمات"
                - "उपयोग गाइड", "कैसे इस्तेमाल करें", "निर्देश"

                PAYMENT METHODS: wishmoney, whish money, match2pay, match 2 pay, banktransfer, bank transfer
                CURRENCIES: USD, USDT, dollars, dollar, $, bucks, دولار, डॉलर
                AMOUNTS: Look for numbers with currency indicators

                Current user context:
                - Authenticated: ${isAuthenticated}
                - Session: ${session ? JSON.stringify(session) : 'none'}
                - Detected Language: ${detectedLanguage}

                RESPONSE FORMAT - Return JSON with:
                {
                "intent": "detected_intent",
                "params": {"extracted_parameters": "values"},
                "needsAuth": true/false,
                "confidence": 0.0-1.0,
                "hasCompleteInfo": true/false,
                "language": "${detectedLanguage}",
                "response": "optional_immediate_response"
                }

                EXAMPLES:
                "Hi" → {"intent": "greeting", "params": {}, "needsAuth": false, "confidence": 0.9, "hasCompleteInfo": true, "language": "english"}
                
                "Login user@email.com pass123" → {"intent": "login", "params": {"email": "user@email.com", "password": "pass123"}, "needsAuth": false, "confidence": 0.95, "hasCompleteInfo": true, "language": "english"}
                
                "Deposit 100 USD using wishmoney" → {"intent": "deposit", "params": {"amount": 100, "currency": "USD", "paymentMethod": "wishmoney"}, "needsAuth": true, "confidence": 0.95, "hasCompleteInfo": true, "language": "english"}
                
                "إيداع 50 دولار باستخدام match2pay" → {"intent": "deposit", "params": {"amount": 50, "currency": "USD", "paymentMethod": "match2pay"}, "needsAuth": true, "confidence": 0.9, "hasCompleteInfo": true, "language": "arabic"}
                
                "Withdraw 50 USD to wishmoney" → {"intent": "withdraw", "params": {"amount": 50, "currency": "USD", "paymentMethod": "wishmoney"}, "needsAuth": true, "confidence": 0.95, "hasCompleteInfo": true, "language": "english"}
                
                "Transfer 25 USD to user@email.com" → {"intent": "transfer", "params": {"amount": 25, "currency": "USD", "email": "user@email.com"}, "needsAuth": true, "confidence": 0.95, "hasCompleteInfo": true, "language": "english"}
                
                "Show my balance" → {"intent": "check_balance", "params": {}, "needsAuth": true, "confidence": 0.95, "hasCompleteInfo": true, "language": "english"}
                
                "My account info" → {"intent": "account_info", "params": {}, "needsAuth": true, "confidence": 0.95, "hasCompleteInfo": true, "language": "english"}
                
                "Show payment methods" → {"intent": "payment_methods", "params": {}, "needsAuth": true, "confidence": 0.95, "hasCompleteInfo": true, "language": "english"}
                
                "Check verification" → {"intent": "check_verification", "params": {}, "needsAuth": true, "confidence": 0.95, "hasCompleteInfo": true, "language": "english"}
                
                "Earn from referrals" → {"intent": "refer_earn", "params": {}, "needsAuth": true, "confidence": 0.95, "hasCompleteInfo": true, "language": "english"}
                
                "Need support" → {"intent": "support", "params": {}, "needsAuth": true, "confidence": 0.95, "hasCompleteInfo": true, "language": "english"}
                
                "Show menu" → {"intent": "menu", "params": {}, "needsAuth": true, "confidence": 0.95, "hasCompleteInfo": true, "language": "english"}
                
                "Logout" → {"intent": "logout", "params": {}, "needsAuth": true, "confidence": 0.95, "hasCompleteInfo": true, "language": "english"}
                
                "How to use" → {"intent": "how_to_use", "params": {}, "needsAuth": false, "confidence": 0.95, "hasCompleteInfo": true, "language": "english"}
                
                "كيفية الاستخدام" → {"intent": "how_to_use", "params": {}, "needsAuth": false, "confidence": 0.95, "hasCompleteInfo": true, "language": "arabic"}
                
                "Create demo account named Test" → {"intent": "create_account", "params": {"type": "demo", "name": "Test"}, "needsAuth": true, "confidence": 0.9, "hasCompleteInfo": true, "language": "english"}

                Analyze this message: "${message}"
            `;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
        ];

        const response = await this.callGroqAPI({
            model: "llama-3.1-8b-instant",
            messages,
            response_format: { type: "json_object" },
            temperature: 0.1
        });

        if (!response?.choices?.[0]?.message?.content) {
            throw new Error("Invalid AI response format");
        }

        const result = JSON.parse(response.choices[0].message.content);
        return { status: "success", ...result };
    }

    // Fallback pattern matching when AI is unavailable
    async analyzeWithPatterns(message, session, isAuthenticated, detectedLanguage) {
        try {
            const lowerMsg = message.toLowerCase().trim();

            // Simple pattern matching for common intents
            const patterns = {
                greeting: /^(hi|hello|hey|hii|مرحبا|أهلا|हैलो|नमस्ते)$/i,
                login: /(login|log in|sign in|تسجيل الدخول|लॉगिन)/i,
                signup: /(signup|sign up|register|إنشاء حساب|रजिस्टर)/i,
                deposit: /(deposit|add money|إيداع|जमा)/i,
                withdraw: /(withdraw|cash out|سحب|निकालना)/i,
                transfer: /(transfer|send money|تحويل|स्थानांतरण)/i,
                check_balance: /(balance|show balance|check balance|رصيد|बैलेंस)/i,
                dashboard: /(dashboard|account overview|لوحة التحكم|डैशबोर्ड)/i,
                support: /(help|support|مساعدة|सहायता)/i,
                menu: /(menu|show menu|قائمة|मेनू)/i,
                how_to_use: /(how to use|usage guide|help guide|كيفية الاستخدام|उपयोग गाइड)/i,
                logout: /(logout|log out|sign out|تسجيل الخروج|लॉगआउट)/i
            };

            // Find matching intent
            for (const [intent, pattern] of Object.entries(patterns)) {
                if (pattern.test(lowerMsg)) {
                    const needsAuth = !['greeting', 'login', 'signup', 'support', 'how_to_use'].includes(intent);

                    return {
                        status: "success",
                        intent: intent,
                        params: {},
                        needsAuth: needsAuth,
                        confidence: 0.8,
                        hasCompleteInfo: intent === 'greeting' || intent === 'support' || intent === 'how_to_use',
                        language: detectedLanguage
                    };
                }
            }

            // Default fallback
            return {
                status: "success",
                intent: "greeting",
                params: {},
                needsAuth: false,
                confidence: 0.5,
                hasCompleteInfo: true,
                language: detectedLanguage
            };

        } catch (error) {
            console.error('Pattern matching error:', error);
            return { status: "error", message: "Failed to analyze with patterns" };
        }
    }

    async callGroqAPI(payload, retries = 2) {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${GROQ_API_KEY}`
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    if (response.status === 429) {
                        if (attempt < retries) {
                            // Exponential backoff: wait 2^attempt seconds
                            const waitTime = Math.pow(2, attempt) * 1000;
                            console.log(`Rate limit hit, waiting ${waitTime}ms before retry ${attempt + 1}/${retries}`);
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                            continue;
                        }
                        throw new Error(`Rate limit exceeded. Please try again in a few minutes.`);
                    } else if (response.status === 401) {
                        throw new Error(`Invalid API key or authentication failed.`);
                    } else if (response.status >= 500) {
                        if (attempt < retries) {
                            const waitTime = 1000 * (attempt + 1);
                            console.log(`Server error ${response.status}, waiting ${waitTime}ms before retry ${attempt + 1}/${retries}`);
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                            continue;
                        }
                        throw new Error(`Groq API server error: ${response.status}. Please try again later.`);
                    } else {
                        throw new Error(`Groq API error: ${response.status} - ${response.statusText}`);
                    }
                }

                return await response.json();
            } catch (error) {
                if (attempt === retries) {
                    console.error('Groq API call failed after all retries:', error);
                    throw error;
                }

                // If it's a network error, retry
                if (error.name === 'TypeError' || error.code === 'ECONNRESET') {
                    const waitTime = 1000 * (attempt + 1);
                    console.log(`Network error, waiting ${waitTime}ms before retry ${attempt + 1}/${retries}`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }

                // If it's an API error, don't retry
                throw error;
            }
        }
    }

}

export default new AIAssistant();
