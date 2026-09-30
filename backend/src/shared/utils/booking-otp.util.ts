import argon2 from "argon2";
import { randomInt } from "crypto";

/**
 * Work-start OTP: the Provider reads this code aloud to confirm the Worker has arrived.
 * Only the Argon2id hash is persisted on `Booking.startOtp` (never the plaintext) — the
 * plaintext is handed back once at generation time so the caller can cache it separately
 * (see bookingStartOtpCacheKey) for the Provider to view again without re-exposing the hash.
 */
export async function generateHashedStartOtp(): Promise<{ code: string; hash: string }> {
  const code = randomInt(100000, 1000000).toString();
  const hash = await argon2.hash(code, { type: argon2.argon2id });
  return { code, hash };
}

export async function verifyStartOtpHash(hash: string, code: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, code);
  } catch {
    return false;
  }
}

export function bookingStartOtpCacheKey(bookingId: string): string {
  return `booking:startotp:${bookingId}`;
}

export const BOOKING_START_OTP_CACHE_TTL_SECONDS = 24 * 60 * 60;
