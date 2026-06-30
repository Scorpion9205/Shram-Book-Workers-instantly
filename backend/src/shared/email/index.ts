import { RabbitMQProvider } from "./providers/rabbitmq.provider.js";
import { EmailService } from "./services/email.service.js";

export const emailService =
  new EmailService(
    new RabbitMQProvider()
  );