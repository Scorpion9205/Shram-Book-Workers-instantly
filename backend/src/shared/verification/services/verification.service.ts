import { OTPService } from "./otp.service.js";
import { VerificationChannel } from "../types/verification.types.js";
import { getVerificationChannel } from "../utils/identifier.util.js";
import { EmailVerificationProvider } from "../providers/email-verification.provider.js";
import { SMSVerificationProvider } from "../providers/sms-verification.provider.js";

export class VerificationService {

  private emailProvider =
    new EmailVerificationProvider();

  private smsProvider =
    new SMSVerificationProvider();

  async sendOTP(

    identifier: string,

    name?: string

  ) {

    const channel =
      getVerificationChannel(
        identifier
      );

    const key =

      channel ===
      VerificationChannel.EMAIL

        ? `otp:email:${identifier}`

        : `otp:phone:${identifier}`;

    const otp =
      await OTPService.createOTP(
        key
      );

    if (
      channel ===
      VerificationChannel.EMAIL
    ) {

      await this.emailProvider.sendOTP(

        identifier,

        otp,

        name

      );

      return;

    }

    await this.smsProvider.sendOTP(

      identifier,

      otp,

      name

    );

  }

  async verifyOTP(

    identifier: string,

    otp: string

  ) {

    const channel =
      getVerificationChannel(
        identifier
      );

    const key =

      channel ===
      VerificationChannel.EMAIL

        ? `otp:email:${identifier}`

        : `otp:phone:${identifier}`;

    return await OTPService.verifyOTP(

      key,

      otp

    );

  }

}