import { EmailService } from "./services/email.service.js";
import { ResendProvider } from "./providers/resend.provider.js";

export const emailService =
  new EmailService(
    new ResendProvider()
  );