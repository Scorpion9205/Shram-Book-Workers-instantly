import { VerificationChannel } from "../types/verification.types.js";

export function getVerificationChannel(
  identifier: string
): VerificationChannel {

  if (
    identifier.includes("@")
  ) {

    return VerificationChannel.EMAIL;

  }

  return VerificationChannel.SMS;

}