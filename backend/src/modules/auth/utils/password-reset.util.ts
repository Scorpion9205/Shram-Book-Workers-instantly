import { randomBytes, createHash } from "crypto";

/**
 * Forgot-password reset token: a 256-bit crypto.randomBytes value, so its security comes
 * from entropy, not from a slow verification hash. Hashed with plain SHA-256 (deterministic)
 * rather than Argon2id (randomized salt per call) so the hash can be looked up directly as a
 * unique key — the reset link only carries the raw token, never a separate identifier.
 */
export function generateResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const PASSWORD_RESET_TOKEN_EXPIRY_MINUTES = 30;
