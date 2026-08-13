/**
 * All Redis cache key naming patterns and namespaces for the SHRAM workspace.
 * Prevents key collision and keeps cache keys structured.
 */
export const CacheKeys = {
  // Auth
  refreshToken: (userId: string) => `auth:refresh:${userId}`,
  otpCode: (identifier: string) => `otp:code:${identifier}`,
  otpAttempts: (identifier: string) => `otp:attempts:${identifier}`,
  pendingSignup: (identifier: string) => `signup:pending:${identifier}`,
  resetPassword: (token: string) => `auth:reset:${token}`,

  // Worker presence & location
  workerStatus: (workerId: string) => `worker:status:${workerId}`,
  workerLocation: 'geo:workers:online',

  // Instant Request
  instantRequestLock: (requestId: string) => `ir:lock:${requestId}`,
  instantRequestBroadcastSet: (requestId: string) => `ir:workers:${requestId}`,

  // Platform settings (cached short-term)
  platformSetting: (key: string) => `platform:setting:${key}`,
  platformSettingAll: 'platform:settings:all',

  // Idempotency
  idempotency: (key: string) => `idempotency:${key}`,

  // Rate limiting
  rateLimit: (identifier: string, action: string) => `ratelimit:${action}:${identifier}`,

  // Bidding
  biddingLock: (biddingId: string) => `bidding:lock:${biddingId}`,
  biddingBids: (biddingId: string) => `bidding:bids:${biddingId}`,
} as const;
