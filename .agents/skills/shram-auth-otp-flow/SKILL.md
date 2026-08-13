---
name: shram-auth-otp-flow
description: >-
  Use this skill when implementing or modifying authentication in SHRAM:
  OTP request/verify flow, JWT access+refresh token lifecycle, Google OAuth,
  work-start OTP for bookings, and Argon2 password hashing for Admin/Agent.
  Activate when: user asks about login, registration, OTP, tokens, auth
  middleware, or the difference between auth OTP and work-start OTP.
---

# SHRAM — Authentication & OTP Flow

## Auth Flow (Provider/Worker — OTP Only)

```
1. POST /auth/otp/request { channel: 'EMAIL'|'PHONE', identifier }
   ← Backend: create Otp record + send code via channel + return { success: true }

2. POST /auth/otp/verify { channel, identifier, code }
   ← Backend: verify hash+expiry+attempts
              if new user → create User + profile (tx)
              issue JWT access token + refresh token (httpOnly cookie)
              ← return { user, accessToken }

Google OAuth path (separate, no OTP):
   POST /auth/google { idToken }
   ← Backend: verify Google ID token → upsert User → issue same JWT pair
```

## OTPService

```typescript
// modules/auth/services/OTPService.ts
export class OTPService implements IOTPService {
  constructor(
    private readonly otpRepo: IOTPRepository,
    private readonly cache: ICacheService,
    private readonly emailProvider: IEmailProvider,
    private readonly smsProvider: ISmsProvider,
  ) {}

  async request(dto: RequestOTPDto): Promise<void> {
    await this.enforceRateLimit(dto.identifier);

    const code = this.generateCode();
    const codeHash = await argon2.hash(code, { type: argon2.argon2id });
    const expiresAt = new Date(Date.now() + OTP_CONSTANTS.EXPIRY_MINUTES * 60 * 1000);

    // Invalidate any previous unused OTP for this identifier+purpose
    await this.otpRepo.invalidatePrevious(dto.identifier, dto.purpose);

    await this.otpRepo.create({
      channel: dto.channel,
      identifier: dto.identifier,
      purpose: dto.purpose,
      codeHash,
      expiresAt,
      bookingId: dto.bookingId, // only for WORK_START
    });

    await this.dispatch(dto.channel, dto.identifier, code);
  }

  async verify(dto: VerifyOTPDto): Promise<boolean> {
    const otp = await this.otpRepo.findActiveOTP(dto.identifier, dto.purpose);

    if (!otp) throw new BusinessException('OTP_NOT_FOUND', 'OTP not found or already used');
    if (otp.expiresAt < new Date()) throw new BusinessException('OTP_EXPIRED', 'OTP has expired');
    if (otp.attempts >= OTP_CONSTANTS.MAX_ATTEMPTS) {
      throw new BusinessException('OTP_LOCKED', 'Too many failed attempts. Request a new OTP.');
    }

    const valid = await argon2.verify(otp.codeHash, dto.code);

    if (!valid) {
      await this.otpRepo.incrementAttempts(otp.id);
      throw new BusinessException('OTP_INVALID', 'Invalid OTP code');
    }

    // Mark as consumed (prevents replay)
    await this.otpRepo.markConsumed(otp.id);
    return true;
  }

  private generateCode(): string {
    // 6-digit cryptographically random OTP
    const { randomInt } = await import('crypto');
    return randomInt(100000, 999999).toString();
  }

  private async enforceRateLimit(identifier: string): Promise<void> {
    const key = CacheKeys.otpAttempts(identifier);
    const count = await this.cache.get<number>(key) ?? 0;
    if (count >= OTP_CONSTANTS.MAX_PER_HOUR) {
      throw new TooManyRequestsException('OTP request limit reached. Try again in 1 hour.');
    }
    await this.cache.incr(key, 3600); // TTL: 1 hour
  }

  private async dispatch(channel: OTPChannel, identifier: string, code: string): Promise<void> {
    const expiryMinutes = OTP_CONSTANTS.EXPIRY_MINUTES;

    if (channel === OTPChannel.EMAIL) {
      await this.emailProvider.send(identifier, 'Your SHRAM OTP', `Your OTP is ${code}. Valid for ${expiryMinutes} minutes.`);
    } else {
      await this.smsProvider.send(identifier, `Your SHRAM OTP is ${code}. Valid for ${expiryMinutes} minutes.`);
    }
  }
}
```

## TokenService

```typescript
// modules/auth/services/TokenService.ts
export class TokenService implements ITokenService {
  constructor(private readonly cache: ICacheService) {}

  generateAccessToken(userId: string, role: UserRole): string {
    return jwt.sign({ userId, role }, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY,
    });
  }

  generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRY,
    });
  }

  async storeRefreshToken(userId: string, token: string): Promise<void> {
    await this.cache.set(CacheKeys.refreshToken(userId), token, 7 * 24 * 60 * 60);
  }

  async verifyRefreshToken(userId: string, token: string): Promise<boolean> {
    const stored = await this.cache.get<string>(CacheKeys.refreshToken(userId));
    return stored === token;
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    await this.cache.del(CacheKeys.refreshToken(userId));
  }

  verifyAccessToken(token: string): ITokenPayload {
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET) as ITokenPayload;
    } catch (e) {
      if ((e as Error).name === 'TokenExpiredError') {
        throw new AuthenticationException('Access token expired', 'TOKEN_EXPIRED');
      }
      throw new AuthenticationException('Invalid access token', 'INVALID_TOKEN');
    }
  }
}
```

## Auth Middleware

```typescript
// middleware/auth.middleware.ts
export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthenticationException('No token provided');
  }

  const token = authHeader.slice(7);
  const payload = tokenService.verifyAccessToken(token);
  req.user = { id: payload.userId, role: payload.role };
  next();
};
```

## Work-Start OTP (Booking)

```typescript
// Triggered when booking → WORKER_EN_ROUTE
async sendWorkStartOTP(bookingId: string): Promise<void> {
  const booking = await this.bookingRepo.findById(bookingId);
  if (!booking) throw new NotFoundException('Booking', bookingId);

  const provider = await this.userRepo.findById(booking.providerId);

  // Send OTP to Provider's phone — they read it to the Worker
  await this.otpService.request({
    channel: OTPChannel.SMS,
    identifier: provider.phone,
    purpose: OTPPurpose.WORK_START,
    bookingId, // links OTP to booking
  });
}

// Verify work-start OTP
async verifyWorkStartOTP(bookingId: string, code: string, providerId: string): Promise<void> {
  const booking = await this.bookingRepo.findById(bookingId);
  const provider = await this.userRepo.findById(providerId);

  await this.otpService.verify({
    channel: OTPChannel.SMS,
    identifier: provider.phone,
    purpose: OTPPurpose.WORK_START,
    code,
  });

  await this.bookingStateService.transition(bookingId, BookingStatus.OTP_VERIFIED, {
    changedBy: providerId,
    reason: 'Work-start OTP verified',
  });
}
```

## OTP Constants (auth/constants/otp.constants.ts)

```typescript
export const OTP_CONSTANTS = {
  EXPIRY_MINUTES: 5,
  MAX_ATTEMPTS: 5,
  MAX_PER_HOUR: 5,
  MIN_REQUEST_INTERVAL_SECONDS: 30,
  CODE_LENGTH: 6,
} as const;
```
