import type{ VerificationProvider } from "./verification-provider.js";

export class SMSVerificationProvider
  implements VerificationProvider {

  async sendOTP(
    phone: string,
    otp: string,
    name?: string
  ): Promise<void> {

    console.log(
      `SMS OTP for ${phone}: ${otp}`
    );

    // Future:
    // Twilio
    // Exotel
    // MSG91

  }

}