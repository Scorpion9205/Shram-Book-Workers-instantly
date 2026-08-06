import { Resend } from "resend";
export class ResendProvider {
    resend;
    constructor() {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            throw new Error("RESEND_API_KEY is missing");
        }
        this.resend =
            new Resend(apiKey);
    }
    async sendEmail(options) {
        console.log("🚀 Sending Email");
        console.log({
            to: options.to,
            subject: options.subject
        });
        const { error } = await this.resend.emails.send({
            from: process.env.EMAIL_FROM,
            to: options.to,
            subject: options.subject,
            html: options.html,
        });
        if (error) {
            throw new Error(error.message);
        }
    }
}
//# sourceMappingURL=resend.provider.js.map