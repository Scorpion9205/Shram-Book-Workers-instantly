import type { PendingSignupData } from "../types/signup.types.js";
export declare class VerificationService {
    private emailProvider;
    private smsProvider;
    sendOTP(identifier: string, name?: string): Promise<void>;
    verifyOTP(identifier: string, otp: string): Promise<boolean>;
    storePendingSignup(identifier: string, data: PendingSignupData): Promise<void>;
    getPendingSignup(identifier: string): Promise<PendingSignupData | null>;
    deletePendingSignup(identifier: string): Promise<void>;
}
//# sourceMappingURL=verification.service.d.ts.map