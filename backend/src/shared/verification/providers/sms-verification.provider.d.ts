import type { VerificationProvider } from "./verification-provider.js";
export declare class SMSVerificationProvider implements VerificationProvider {
    sendOTP(phone: string, otp: string, name?: string): Promise<void>;
}
//# sourceMappingURL=sms-verification.provider.d.ts.map