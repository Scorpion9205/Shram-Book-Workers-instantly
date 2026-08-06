import type { EmailProvider } from "./email-provider.js";
import type { EmailOptions } from "../types/email.types.js";
export declare class ResendProvider implements EmailProvider {
    private resend;
    constructor();
    sendEmail(options: EmailOptions): Promise<void>;
}
//# sourceMappingURL=resend.provider.d.ts.map