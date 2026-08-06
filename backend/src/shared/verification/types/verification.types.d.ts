export declare enum VerificationChannel {
    EMAIL = "EMAIL",
    SMS = "SMS"
}
export interface SendOTPOptions {
    identifier: string;
    name?: string;
}
export interface VerifyOTPOptions {
    identifier: string;
    otp: string;
}
export interface OTPData {
    otp: string;
    expiresAt: number;
}
//# sourceMappingURL=verification.types.d.ts.map