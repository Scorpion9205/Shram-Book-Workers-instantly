export interface VerificationProvider {

  sendOTP(
    recipient: string,
    otp: string,
    name?: string
  ): Promise<void>;

}