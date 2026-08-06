import type { EmailProvider } from "./email-provider.js";
import type { EmailMessage } from "../../queue/types/email-message.types.js";
export declare class RabbitMQProvider implements EmailProvider {
    sendEmail(data: EmailMessage): Promise<void>;
}
//# sourceMappingURL=rabbitmq.provider.d.ts.map