/**
 * Parses a jsonwebtoken-style expiry string ("15m", "1h", "7d", "900s") into whole seconds.
 * Falls back to `fallbackSeconds` for any value it doesn't recognize, rather than throwing —
 * callers use this for cache TTLs where a safe default beats a crashed request.
 */
export function parseDurationToSeconds(value: string, fallbackSeconds: number): number {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(value.trim());
  if (!match) {
    return fallbackSeconds;
  }

  const amount = Number(match[1]);
  const unit = match[2]!.toLowerCase();
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[unit] ?? 1;
  return amount * multiplier;
}
