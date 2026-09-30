import { describe, it, expect } from "vitest";
import { generateHashedStartOtp, verifyStartOtpHash, bookingStartOtpCacheKey } from "./booking-otp.util.js";

describe("booking-otp.util", () => {
  it("generates a 6-digit plaintext code whose hash is not the plaintext itself", async () => {
    const { code, hash } = await generateHashedStartOtp();

    expect(code).toMatch(/^\d{6}$/);
    expect(hash).not.toBe(code);
    expect(hash.length).toBeGreaterThan(code.length);
  });

  it("verifies the correct code against its own hash", async () => {
    const { code, hash } = await generateHashedStartOtp();
    await expect(verifyStartOtpHash(hash, code)).resolves.toBe(true);
  });

  it("rejects an incorrect code against a hash", async () => {
    const { hash } = await generateHashedStartOtp();
    await expect(verifyStartOtpHash(hash, "000000")).resolves.toBe(false);
  });

  it("does not throw on a malformed hash, just returns false", async () => {
    await expect(verifyStartOtpHash("not-a-real-argon2-hash", "123456")).resolves.toBe(false);
  });

  it("builds a namespaced cache key per booking", () => {
    expect(bookingStartOtpCacheKey("booking_1")).toBe("booking:startotp:booking_1");
  });
});
