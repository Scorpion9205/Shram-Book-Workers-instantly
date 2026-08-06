import type { EmailProvider } from "../providers/email-provider.js";
export declare class EmailService {
    private provider;
    constructor(provider: EmailProvider);
    send(to: string, subject: string, component: React.ReactElement): Promise<void>;
    sendWelcomeEmail(to: string, name: string): Promise<void>;
    sendForgotPasswordEmail(to: string, name: string, resetLink: string): Promise<void>;
    sendPasswordChangedEmail(to: string, name: string): Promise<void>;
    sendOTPEmail(to: string, name: string, otp: string): Promise<void>;
}
//# sourceMappingURL=email.service.d.ts.map