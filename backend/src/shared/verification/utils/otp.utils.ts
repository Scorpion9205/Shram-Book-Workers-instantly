import { randomInt } from "crypto";

import { BadRequestException } from "../../../core/exceptions/index.js";

/**
 * Cryptographically secure OTP generation using Node.js crypto.randomInt.
 * Guarantees uniform distribution and eliminates PRNG prediction vulnerabilities.
 */
export function generateOTP(length: number = 6): string {
  if (length <= 0) {
    throw new BadRequestException("OTP length must be greater than 0");
  }

  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length);
  return randomInt(min, max).toString();
}

export const generateSecureOtp = generateOTP;