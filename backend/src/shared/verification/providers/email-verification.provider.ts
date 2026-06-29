import { emailService } from "../../email/index.js";
import type{ VerificationProvider } from "./verification-provider.js";

export class EmailVerificationProvider
  implements VerificationProvider {

  async sendOTP(
    email: string,
    otp: string,
    name?: string
  ) {

    await emailService.sendOTPEmail(

      email,

      name ?? "User",

      otp

    );

  }

}