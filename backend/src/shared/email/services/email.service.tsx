import { renderEmail } from "../utils/render-email.js";
import type { EmailProvider } from "../providers/email-provider.js";
import WelcomeEmail from "../templates/Welcome.js";
import ForgotPassword from "../templates/ForgotPassword.js";
import PasswordChanged
from "../templates/PasswordChanged.js";
export class EmailService {

  constructor(

    private provider: EmailProvider

  ) {}

  async send(

    to: string,

    subject: string,

    component: React.ReactElement

  ) {

    const html =
      await renderEmail(component);

    await this.provider.sendEmail({

      to,

      subject,

      html,

    });

  }
  async sendWelcomeEmail(
  to: string,
  name: string
) {
  await this.send(
    to,
    "Welcome to SHRAM 🎉",
    <WelcomeEmail name={name} />
  );
}
async sendForgotPasswordEmail(

  to: string,

  name: string,

  resetLink: string

) {

  await this.send(

    to,

    "Reset your SHRAM password",

    <ForgotPassword
      name={name}
      resetLink={resetLink}
    />

  );

}
async sendPasswordChangedEmail(

    to: string,

    name: string

){

    await this.send(

        to,

        "✅ Your SHRAM password has been changed",

        <PasswordChanged
            name={name}
        />

    );

}
}