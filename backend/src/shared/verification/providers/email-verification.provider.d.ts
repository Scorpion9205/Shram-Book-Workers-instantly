import type { VerificationProvider } from "./verification-provider.js";
export declare class EmailVerificationProvider implements VerificationProvider {
    sendOTP(email: string, otp: string, name?: string): Promise<void>;
}
//# sourceMappingURL=email-verification.provider.d.ts.map