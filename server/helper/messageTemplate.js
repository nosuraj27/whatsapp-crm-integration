
// Email content data for signup email
const signupEmailData = {
    title: "Health Insurance Account Creation",
    heading: "Welcome to Health Insurance!",
    subheading: "Your account has been successfully created.",
    iconUrl: "https://img.icons8.com/color/48/000000/ok--v1.png",
    iconAlt: "Success Icon",
    buttonText: "Login to Your Account",
    buttonUrl: "#",
    warningText: "Please keep your password safe and secure.",
    footerMessage: "This is an automated email. Please do not reply to this message."
};

// Email content data for forgot password email
const forgotPasswordEmailData = {
    title: "Reset Your Password",
    heading: "Reset Your Password",
    subheading: "We received a request to reset your password. If you didn't make this request, you can ignore this email.",
    iconUrl: "https://cdn-icons-png.flaticon.com/512/6357/6357042.png", // New beautiful lock reset icon
    iconAlt: "Reset Password Icon",
    buttonText: "Reset Password",
    noteText: "Note: This link is valid for the next 30 minutes.",
    footerMessage: "If you didn't request a password reset, please contact us immediately."
};

// Email content data for verify email
const verifyEmailData = {
    title: "Verify Your Email",
    heading: "Verify Your Email Address",
    subheading: "Thank you for registering with Health Insurance. To complete your registration and access all our services, please verify your email address.",
    iconUrl: "https://cdn-icons-png.flaticon.com/512/9149/9149889.png", // New beautiful email verification icon
    iconAlt: "Verify Email Icon",
    buttonText: "Verify Email Address",
    noteText: "If you did not create an account with us, please disregard this email."
};

// Company information used across all emails
const companyInfo = {
    name: "UhuruCare Health Insurance Team",
    email: "support@healthinsurance.com",
    website: "www.healthinsurance.com",
    headerText: "Health Insurance"
};

const appointmentOnlineBookedEmailData = {
    title: "Appointment Confirmation",
    heading: "Your Appointment is Confirmed",
    subheading: "Thank you for booking your appointment with us.",
    iconUrl: "https://img.icons8.com/color/48/000000/ok--v1.png",
    iconAlt: "Appointment Icon",
};

const appointmentOnlineCanceledEmailData = {
    title: "Appointment Cancellation",
    heading: "Your Appointment has been Canceled",
    subheading: "We are sorry to inform you that your appointment has been canceled.",
    iconUrl: "https://img.icons8.com/color/48/000000/cancel.png",
    iconAlt: "Cancellation Icon",
};

export default {

    signupEmail: async (data) => {
        let html = `
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">

            <head>
                <title>${signupEmailData.title}</title>
                <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </head>

            <body style="margin:0; padding:0;" bgcolor="#eaeced">
                <table style="min-width:320px;" width="100%" cellspacing="0" cellpadding="0" bgcolor="#eaeced">
                    <!-- fix for gmail -->
                    <tr>
                        <td class="hide">
                            <table width="600" cellpadding="0" cellspacing="0" style="width:600px !important;">
                                <tr>
                                    <td style="min-width:600px; font-size:0; line-height:0;">
                                        &nbsp;
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="wrapper" style="padding:0 10px;">
                            <table data-module="module-2" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td data-bgcolor="bg-module" bgcolor="#ffffff">
                                        <table class="flexible" width="600" align="center" style="margin:0 auto;" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td class="img-flex" bgcolor="#0077CC">
                                                    <h3 style="color:#FFFFFF; padding: 20px; font-family: sans-serif; margin: 0; text-align: center; font-size: 24px;">${companyInfo.headerText}</h3>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td data-bgcolor="bg-block" class="holder" style="padding:48px 50px 40px;" bgcolor="#f9f9f9">
                                                    <table width="100%" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td data-color="title" align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 24px;">
                                                                Dear <strong>${data.fullName}</strong>,
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="padding:0 0 30px;">
                                                                <img src="${signupEmailData.iconUrl}" width="80" alt="${signupEmailData.iconAlt}" style="display:block; margin:0 auto;" />
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="font:22px/28px Arial, Helvetica, sans-serif; color:#292c34; font-weight:bold; padding:0 0 24px;">
                                                                ${signupEmailData.heading}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="font:16px/24px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 26px;">
                                                                ${signupEmailData.subheading}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:0 0 30px;">
                                                                <div style="background-color:#e8f0fe; border-left:4px solid #0077CC; padding:20px; border-radius:5px;">
                                                                    <p style="font-family:Arial, Helvetica, sans-serif; font-size:16px; color:#292c34; margin-top:0; font-weight:bold;">Your Account Details:</p>
                                                                    <table width="100%" cellpadding="0" cellspacing="0">
                                                                        <tr>
                                                                            <td width="20" valign="top" style="padding:5px 0;">📧</td>
                                                                            <td style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; padding:5px 0;">
                                                                                <strong>Email ID:</strong> ${data.email}
                                                                            </td>
                                                                        </tr>
                                                                        <tr>
                                                                            <td width="20" valign="top" style="padding:5px 0;">🔐</td>
                                                                            <td style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; padding:5px 0;">
                                                                                <strong>Password:</strong> ${data.password}
                                                                            </td>
                                                                        </tr>
                                                                    </table>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#ea4335; font-weight:bold; padding:0 0 20px;">
                                                                ${signupEmailData.warningText}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 25px;">
                                                                You can now access all our services by logging into your account:
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="padding:0 0 30px;">
                                                                <table cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td bgcolor="#0077CC" style="border-radius:5px;">
                                                                            <a href="${signupEmailData.buttonUrl}" style="display:inline-block; font:16px/22px Arial, Helvetica, sans-serif; color:#ffffff; text-decoration:none; padding:12px 30px; font-weight:bold;">${signupEmailData.buttonText}</a>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 20px;">
                                                                If you have any questions or need assistance, please don't hesitate to contact our customer support team.
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:20px 0 0; border-top:1px solid #e5e5e5;">
                                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 5px;">
                                                                            Warm regards,
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; font-weight:bold; padding:0 0 5px;">
                                                                            ${companyInfo.name}
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td align="left" style="font:14px/20px Arial, Helvetica, sans-serif; color:#999999; padding:10px 0 0;">
                                                                            Email: ${companyInfo.email}<br>
                                                                            Website: ${companyInfo.website}
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td align="left" style="font:12px/18px Arial, Helvetica, sans-serif; color:#999999; padding:20px 0 0;">
                                                                            ${signupEmailData.footerMessage}
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- fix for gmail -->
                    <tr>
                        <td style="line-height:0;">
                            <div style="display:none; white-space:nowrap; font:15px/1px courier;">
                                &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
                            </div>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;
        return html;
    },

    forgotPasswordEmail: async (data) => {
        let html = `
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">

            <head>
                <title>${forgotPasswordEmailData.title}</title>
                <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </head>

            <body style="margin:0; padding:0;" bgcolor="#eaeced">
                <table style="min-width:320px;" width="100%" cellspacing="0" cellpadding="0" bgcolor="#eaeced">
                    <!-- fix for gmail -->
                    <tr>
                        <td class="hide">
                            <table width="600" cellpadding="0" cellspacing="0" style="width:600px !important;">
                                <tr>
                                    <td style="min-width:600px; font-size:0; line-height:0;">
                                        &nbsp;
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="wrapper" style="padding:0 10px;">
                            <table data-module="module-2" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td data-bgcolor="bg-module" bgcolor="#ffffff">
                                        <table class="flexible" width="600" align="center" style="margin:0 auto;" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td class="img-flex" bgcolor="#0077CC">
                                                    <h3 style="color:#FFFFFF; padding: 20px; font-family: sans-serif; margin: 0; text-align: center; font-size: 24px;">${companyInfo.headerText}</h3>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td data-bgcolor="bg-block" class="holder" style="padding:48px 50px 40px;" bgcolor="#f9f9f9">
                                                    <table width="100%" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td data-color="title" align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 24px;">
                                                                Dear <strong>${data.fullName}</strong>,
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="padding:0 0 30px;">
                                                                <img src="${forgotPasswordEmailData.iconUrl}" width="80" alt="${forgotPasswordEmailData.iconAlt}" style="display:block; margin:0 auto;" />
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="font:22px/28px Arial, Helvetica, sans-serif; color:#292c34; font-weight:bold; padding:0 0 24px;">
                                                                ${forgotPasswordEmailData.heading}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="font:16px/24px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 26px;">
                                                                ${forgotPasswordEmailData.subheading}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="padding:0 0 30px;">
                                                                <table cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td bgcolor="#0077CC" style="border-radius:5px;">
                                                                            <a href="${data.reset_link}" style="display:inline-block; font:16px/22px Arial, Helvetica, sans-serif; color:#ffffff; text-decoration:none; padding:12px 30px; font-weight:bold;">${forgotPasswordEmailData.buttonText}</a>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="font:14px/20px Arial, Helvetica, sans-serif; color:#666666; padding:0 0 20px;">
                                                                Or copy and paste this link into your browser:
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="padding:0 0 30px;">
                                                                <div style="background-color:#f0f0f0; border:1px solid #dddddd; padding:12px; border-radius:5px; word-break:break-all; font:14px/20px Arial, Helvetica, sans-serif; color:#666666;">
                                                                    ${data.reset_link}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#ea4335; padding:0 0 20px;">
                                                                <strong>${forgotPasswordEmailData.noteText}</strong>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:20px 0 0; border-top:1px solid #e5e5e5;">
                                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 5px;">
                                                                            Warm regards,
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; font-weight:bold; padding:0 0 5px;">
                                                                            ${companyInfo.name}
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td align="left" style="font:14px/20px Arial, Helvetica, sans-serif; color:#999999; padding:10px 0 0;">
                                                                            Email: ${companyInfo.email}<br>
                                                                            Website: ${companyInfo.website}
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td align="left" style="font:12px/18px Arial, Helvetica, sans-serif; color:#999999; padding:20px 0 0;">
                                                                            ${forgotPasswordEmailData.footerMessage}
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- fix for gmail -->
                    <tr>
                        <td style="line-height:0;">
                            <div style="display:none; white-space:nowrap; font:15px/1px courier;">
                                &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
                            </div>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;
        return html;
    },

    verifyEmail: async (data) => {
        let html = `
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

            <head>
                <title>${verifyEmailData.title}</title>
                <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </head>

            <body style="margin:0; padding:0;" bgcolor="#eaeced">
                <table style="min-width:320px;" width="100%" cellspacing="0" cellpadding="0" bgcolor="#eaeced">
                    <!-- fix for gmail -->
                    <tr>
                        <td class="hide">
                            <table width="600" cellpadding="0" cellspacing="0" style="width:600px !important;">
                                <tr>
                                    <td style="min-width:600px; font-size:0; line-height:0;">
                                        &nbsp;
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="wrapper" style="padding:0 10px;">
                            <table data-module="module-2" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td data-bgcolor="bg-module" bgcolor="#ffffff">
                                        <table class="flexible" width="600" align="center" style="margin:0 auto;" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td class="img-flex" bgcolor="#0077CC">
                                                    <h3 style="color:#FFFFFF; padding: 20px; font-family: sans-serif; margin: 0; text-align: center; font-size: 24px;">${companyInfo.headerText}</h3>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td data-bgcolor="bg-block" class="holder" style="padding:48px 50px 40px;" bgcolor="#f9f9f9">
                                                    <table width="100%" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td data-color="title" align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 24px;">
                                                                Dear <strong>${data.fullName}</strong>,
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="padding:0 0 30px;">
                                                                <img src="${verifyEmailData.iconUrl}" width="80" alt="${verifyEmailData.iconAlt}" style="display:block; margin:0 auto;" />
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="font:22px/28px Arial, Helvetica, sans-serif; color:#292c34; font-weight:bold; padding:0 0 24px;">
                                                                ${verifyEmailData.heading}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="font:16px/24px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 26px;">
                                                                ${verifyEmailData.subheading}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="padding:0 0 30px;">
                                                                <table cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td bgcolor="#0077CC" style="border-radius:5px;">
                                                                            <a href="${data.verify_link}" style="display:inline-block; font:16px/22px Arial, Helvetica, sans-serif; color:#ffffff; text-decoration:none; padding:12px 30px; font-weight:bold;">${verifyEmailData.buttonText}</a>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="font:14px/20px Arial, Helvetica, sans-serif; color:#666666; padding:0 0 20px;">
                                                                Or copy and paste this link into your browser:
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="padding:0 0 30px;">
                                                                <div style="background-color:#f0f0f0; border:1px solid #dddddd; padding:12px; border-radius:5px; word-break:break-all; font:14px/20px Arial, Helvetica, sans-serif; color:#666666;">
                                                                    ${data.verify_link}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 20px;">
                                                                ${verifyEmailData.noteText}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:20px 0 0; border-top:1px solid #e5e5e5;">
                                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 5px;">
                                                                            Warm regards,
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; font-weight:bold; padding:0 0 5px;">
                                                                            ${companyInfo.name}
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td align="left" style="font:14px/20px Arial, Helvetica, sans-serif; color:#999999; padding:10px 0 0;">
                                                                            Email: ${companyInfo.email}<br>
                                                                            Website: ${companyInfo.website}
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- fix for gmail -->
                    <tr>
                        <td style="line-height:0;">
                            <div style="display:none; white-space:nowrap; font:15px/1px courier;">
                                &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
                            </div>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;
        return html;
    },

    appointmentOnlineBookedEmail: async (data) => {
        let html = `
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
                <title>${appointmentOnlineBookedEmailData.title}</title>
                <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </head>
            <body style="margin:0; padding:0;" bgcolor="#eaeced">
                <table style="min-width:320px;" width="100%" cellspacing="0" cellpadding="0" bgcolor="#eaeced">
                    <!-- fix for gmail -->
                    <tr>
                        <td class="hide">
                            <table width="600" cellpadding="0" cellspacing="0" style="width:600px !important;">
                                <tr>
                                    <td style="min-width:600px; font-size:0; line-height:0;">
                                        &nbsp;
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="wrapper" style="padding:0 10px;">
                            <table data-module="module-2" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td data-bgcolor="bg-module" bgcolor="#ffffff">
                                        <table class="flexible" width="600" align="center" style="margin:0 auto;" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td class="img-flex" bgcolor="#0077CC">
                                                    <h3 style="color:#FFFFFF; padding: 20px; font-family: sans-serif; margin: 0; text-align: center; font-size: 24px;">${companyInfo.headerText}</h3>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td data-bgcolor="bg-block" class="holder" style="padding:48px 50px 40px;" bgcolor="#f9f9f9">
                                                    <table width="100%" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td data-color="title" align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 24px;">
                                                                Dear ${data.fullName},
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="padding:0 0 30px;">
                                                                <img src="${appointmentOnlineBookedEmailData.iconUrl}" width="80" alt="${appointmentOnlineBookedEmailData.iconAlt}" style="display:block; margin:0 auto;" />
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="font:22px/28px Arial, Helvetica, sans-serif; color:#292c34; font-weight:bold; padding:0 0 24px;">
                                                                ${appointmentOnlineBookedEmailData.heading}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="font:16px/24px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 26px;">
                                                                ${appointmentOnlineBookedEmailData.subheading}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 20px;">
                                                                Your appointment details are as follows:
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 10px;">
                                                                <strong>Date:</strong> ${data.appointmentDate}<br>
                                                                <strong>Time:</strong> ${data.appointmentTime}<br>
                                                                <strong>Meeting Link:</strong> <a href="${data.appointmentLink}" style="color:#0077CC; text-decoration:none;">${data.appointmentLink}</a>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 20px;">
                                                                If you have any questions or need to reschedule, please contact us at ${companyInfo.email}.
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:20px 0 0; border-top:1px solid #e5e5e5;">
                                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 5px;">
                                                                            Warm regards,
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; font-weight:bold; padding:0 0 5px;">
                                                                            ${companyInfo.name}
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td align="left" style="font:14px/20px Arial, Helvetica, sans-serif; color:#999999; padding:10px 0 0;">
                                                                            Email: ${companyInfo.email}<br>
                                                                            Website: ${companyInfo.website}
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>`;
        return html;
    },

    appointmentOnlineCenceledEmail: async (data) => {
        let html = `
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
                <title>${appointmentOnlineCanceledEmailData.title}</title>
                <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </head>
            <body style="margin:0; padding:0;" bgcolor="#eaeced">
                <table style="min-width:320px;" width="100%" cellspacing="0" cellpadding="0" bgcolor="#eaeced">
                    <!-- fix for gmail -->
                    <tr>
                        <td class="hide">
                            <table width="600" cellpadding="0" cellspacing="0" style="width:600px !important;">
                                <tr>
                                    <td style="min-width:600px; font-size:0; line-height:0;">
                                        &nbsp;
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="wrapper" style="padding:0 10px;">
                            <table data-module="module-2" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td data-bgcolor="bg-module" bgcolor="#ffffff">
                                        <table class="flexible" width="600" align="center" style="margin:0 auto;" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td class="img-flex" bgcolor="#0077CC">
                                                    <h3 style="color:#FFFFFF; padding: 20px; font-family: sans-serif; margin: 0; text-align: center; font-size: 24px;">${companyInfo.headerText}</h3>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td data-bgcolor="bg-block" class="holder" style="padding:48px 50px 40px;" bgcolor="#f9f9f9">
                                                    <table width="100%" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td data-color="title" align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 24px;">
                                                                Dear ${data.fullName},
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="padding:0 0 30px;">
                                                                <img src="${appointmentOnlineCanceledEmailData.iconUrl}" width="80" alt="${appointmentOnlineCanceledEmailData.iconAlt}" style="display:block; margin:0 auto;" />
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="font:22px/28px Arial, Helvetica, sans-serif; color:#292c34; font-weight:bold; padding:0 0 24px;">
                                                                ${appointmentOnlineCanceledEmailData.heading}   
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="font:16px/24px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 26px;">
                                                                ${appointmentOnlineCanceledEmailData.subheading}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 20px;">
                                                                Your appointment details are as follows:
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 10px;">
                                                                <strong>Date:</strong> ${data.appointmentDate}<br>
                                                                <strong>Time:</strong> ${data.appointmentTime}<br>
                                                                <strong>Meeting Link:</strong> <a href="${data.appointmentLink}" style="color:#0077CC; text-decoration:none;">${data.appointmentLink}</a>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 20px;">
                                                                If you have any questions or need to reschedule, please contact us at ${companyInfo.email}.
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:20px 0 0; border-top:1px solid #e5e5e5;">
                                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                                    <tr>
                                                                        <td align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; padding:0 0 5px;">
                                                                            Warm regards,
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td align="left" style="font:16px/22px Arial, Helvetica, sans-serif; color:#292c34; font-weight:bold; padding:0 0 5px;">
                                                                            ${companyInfo.name}
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td align="left" style="font:14px/20px Arial, Helvetica, sans-serif; color:#999999; padding:10px 0 0;">
                                                                            Email: ${companyInfo.email}<br>
                                                                            Website: ${companyInfo.website}
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>`;
        return html;
    },

    appointmentOnlineBookedSMS: async (data) => {
        let message = `Dear ${data.fullName},\n\nYour appointment has been successfully booked.\n\nDate: ${data.appointmentDate}\nTime: ${data.appointmentTime}\nMeeting Link: ${data.appointmentLink}\n\nIf you have any questions, please contact us at ${companyInfo.email}.\n\nBest Regards,\n${companyInfo.name}`;
        return message;
    },

    signupSMS: async (data) => {
        let message = `Dear ${data.fullName},\n\nWelcome to ${companyInfo.name}!\n\nYour account has been successfully created.\n\nEmail ID: ${data.email}\nPassword: ${data.password}\n\nPlease keep this information secure.\n\nBest Regards,\n${companyInfo.name}`;
        return message;
    },

    forgotPasswordSMS: async (data) => {
        let message = `Dear ${data.fullName},\n\nYou have requested to reset your password for your account at ${companyInfo.name}.\n\nPlease click the link below to reset your password:\n${data.reset_link}\n\nIf you did not request this, please ignore this message.\n\nBest Regards,\n${companyInfo.name}`;
        return message;
    },


}