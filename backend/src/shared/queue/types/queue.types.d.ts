export declare enum EmailType {
    WELCOME = "WELCOME",
    FORGOT_PASSWORD = "FORGOT_PASSWORD",
    PASSWORD_CHANGED = "PASSWORD_CHANGED",
    OTP = "OTP"
}
export interface EmailQueuePayload {
    type: EmailType;
    email: string;
    name?: string;
    otp?: string;
    resetLink?: string;
}
//# sourceMappingURL=queue.types.d.ts.map