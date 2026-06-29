import { Resend } from "resend";
import type{ EmailProvider } from "./email-provider.js";
import type{ EmailOptions } from "../types/email.types.js";

export class ResendProvider
  implements EmailProvider {

  private resend: Resend;

  constructor() {

    const apiKey =
      process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY is missing"
      );
    }

    this.resend =
      new Resend(apiKey);

  }

  async sendEmail(
    options: EmailOptions
  ): Promise<void> {

    const { error } =
      await this.resend.emails.send({

        from:
          process.env.EMAIL_FROM!,

        to:
          options.to,

        subject:
          options.subject,

        html:
          options.html,

      });

    if (error) {
      throw new Error(error.message);
    }

  }

}