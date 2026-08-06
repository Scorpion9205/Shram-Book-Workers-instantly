import { emailService } from "../../email/index.js";
export class EmailVerificationProvider {
    async sendOTP(email, otp, name) {
        await emailService.sendOTPEmail(email, name ?? "User", otp);
        console.log("📩 EmailVerificationProvider");
        console.log({
            email,
            otp,
            name
        });
    }
}
//# sourceMappingURL=email-verification.provider.js.map