import { jsx as _jsx } from "react/jsx-runtime";
import { renderEmail } from "../utils/render-email.js";
import WelcomeEmail from "../templates/Welcome.js";
import ForgotPassword from "../templates/ForgotPassword.js";
import PasswordChanged from "../templates/PasswordChanged.js";
import OtpEmail from "../templates/OtpEmail.js";
export class EmailService {
    provider;
    constructor(provider) {
        this.provider = provider;
    }
    async send(to, subject, component) {
        const html = await renderEmail(component);
        await this.provider.sendEmail({
            to,
            subject,
            html,
        });
    }
    async sendWelcomeEmail(to, name) {
        await this.send(to, "Welcome to SHRAM 🎉", _jsx(WelcomeEmail, { name: name }));
    }
    async sendForgotPasswordEmail(to, name, resetLink) {
        await this.send(to, "Reset your SHRAM password", _jsx(ForgotPassword, { name: name, resetLink: resetLink }));
    }
    async sendPasswordChangedEmail(to, name) {
        await this.send(to, "Your SHRAM password has been changed", _jsx(PasswordChanged, { name: name }));
    }
    async sendOTPEmail(to, name, otp) {
        console.log("📨 sendOTPEmail");
        console.log({
            to,
            name,
            otp
        });
        await this.send(to, "Your SHRAM Verification Code", _jsx(OtpEmail, { name: name, otp: otp }));
    }
}
//# sourceMappingURL=email.service.js.map