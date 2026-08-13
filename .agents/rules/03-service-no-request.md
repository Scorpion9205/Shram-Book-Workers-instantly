# SHRAM Coding Rules — Services Are Express-Free

## Rule 03: Services Never Import Express Types

Services contain **all business logic**. They are framework-agnostic. They never receive `req` or `res` objects, and they never import anything from `express`.

### ✅ CORRECT

```typescript
// IAuthService.ts
export interface IAuthService {
  requestOTP(channel: OTPChannel, identifier: string): Promise<void>;
  verifyOTP(channel: OTPChannel, identifier: string, code: string): Promise<AuthResult>;
  refreshToken(token: string): Promise<{ accessToken: string }>;
  logout(userId: string): Promise<void>;
}

// AuthService.ts
export class AuthService implements IAuthService {
  constructor(
    private readonly otpService: IOTPService,
    private readonly tokenService: ITokenService,
    private readonly userRepo: IUserRepository,
    private readonly cacheService: ICacheService,
  ) {}

  async requestOTP(channel: OTPChannel, identifier: string): Promise<void> {
    // Pure business logic — no req/res
    const rateKey = `otp:rate:${identifier}`;
    const attempts = await this.cacheService.get<number>(rateKey) ?? 0;
    if (attempts >= 5) throw new TooManyRequestsException('OTP limit reached');
    await this.otpService.create({ channel, identifier, purpose: OTPPurpose.LOGIN });
    await this.cacheService.incr(rateKey, 3600);
  }
}
```

### ❌ WRONG

```typescript
export class AuthService {
  // ❌ Service receiving Express Request
  async login(req: Request, res: Response) { ... }

  // ❌ Service reading from req directly
  async login(req: any) {
    const { email } = req.body;
  }

  // ❌ Service setting cookies directly
  res.cookie('refreshToken', token, { httpOnly: true });
}
```

### Rules

- Service method parameters are **plain data types** (strings, numbers, DTOs, enums)
- Cookie-setting happens in the **controller** after the service returns tokens
- Services throw typed `AppException` subclasses — never catch and swallow errors
- Services orchestrate repositories and emit domain events; they never call `res.json()`
