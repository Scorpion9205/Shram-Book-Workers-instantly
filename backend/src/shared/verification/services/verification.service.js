import { OTPService } from "./otp.service.js";
import { VerificationChannel } from "../types/verification.types.js";
import { getVerificationChannel } from "../utils/identifier.util.js";
import { EmailVerificationProvider } from "../providers/email-verification.provider.js";
import { SMSVerificationProvider } from "../providers/sms-verification.provider.js";
import { RedisService } from "../../services/redis/redis.service.js";
export class VerificationService {
    emailProvider = new EmailVerificationProvider();
    smsProvider = new SMSVerificationProvider();
    async sendOTP(identifier, name) {
        const channel = getVerificationChannel(identifier);
        const key = channel ===
            VerificationChannel.EMAIL
            ? `otp:email:${identifier}`
            : `otp:phone:${identifier}`;
        const otp = await OTPService.createOTP(key);
        console.log("📧 Identifier:", identifier);
        console.log("👤 Name:", name);
        console.log("🔑 OTP:", otp);
        console.log("📨 Channel:", channel);
        if (channel ===
            VerificationChannel.EMAIL) {
            await this.emailProvider.sendOTP(identifier, otp, name);
            return;
        }
        await this.smsProvider.sendOTP(identifier, otp, name);
    }
    async verifyOTP(identifier, otp) {
        const channel = getVerificationChannel(identifier);
        const key = channel ===
            VerificationChannel.EMAIL
            ? `otp:email:${identifier}`
            : `otp:phone:${identifier}`;
        return await OTPService.verifyOTP(key, otp);
    }
    async storePendingSignup(identifier, data) {
        await RedisService.set(`signup:email:${identifier}`, data, 600);
    }
    async getPendingSignup(identifier) {
        return await RedisService.get(`signup:email:${identifier}`);
    }
    async deletePendingSignup(identifier) {
        await RedisService.del(`signup:email:${identifier}`);
    }
}
//# sourceMappingURL=verification.service.js.map