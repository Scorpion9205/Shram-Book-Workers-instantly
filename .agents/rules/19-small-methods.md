# SHRAM Coding Rules — Small Methods, Low Complexity

## Rule 19: Methods Are Small, Focused, and Low-Complexity

Every method does **one thing**. If a method exceeds 25-30 lines, it must be decomposed into smaller private helpers. High cyclomatic complexity is a code smell.

### Method Size Guidelines

| Layer | Max Lines | Notes |
|---|---|---|
| Controller method | 10 lines | Parse → call service → respond |
| Service method | 25 lines | Extract private helpers for sub-steps |
| Repository method | 15 lines | One Prisma query + optional transform |
| Helper/util function | 20 lines | Single transformation or calculation |

### ✅ CORRECT — Decomposed Service

```typescript
export class OTPService implements IOTPService {
  async request(channel: OTPChannel, identifier: string, purpose: OTPPurpose): Promise<void> {
    await this.enforceRateLimit(identifier);
    const code = this.generateCode();
    const codeHash = await this.hashCode(code);
    await this.saveOTPRecord(channel, identifier, purpose, codeHash);
    await this.dispatch(channel, identifier, code);
  }

  private async enforceRateLimit(identifier: string): Promise<void> {
    const attempts = await this.cache.get<number>(CacheKeys.otpAttempts(identifier)) ?? 0;
    if (attempts >= OTP_CONSTANTS.MAX_PER_HOUR) {
      throw new TooManyRequestsException('OTP request limit exceeded. Try again in 1 hour.');
    }
    await this.cache.incr(CacheKeys.otpAttempts(identifier), 3600);
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async hashCode(code: string): Promise<string> {
    return argon2.hash(code, { type: argon2.argon2id });
  }

  private async saveOTPRecord(...): Promise<void> { ... }
  private async dispatch(...): Promise<void> { ... }
}
```

### ❌ WRONG — God Method

```typescript
// ❌ 100+ line method doing everything
async requestOTP(channel: string, identifier: string, purpose: string) {
  // rate limit check...
  // generate code...
  // hash code...
  // save to DB...
  // send email...
  // send sms...
  // log...
  // update redis...
  // return response...
}
```

### Single Responsibility Principle

- A service is responsible for **one domain concept** (OTPService handles OTPs; TokenService handles tokens)
- Don't combine unrelated operations in one service class
- When a service grows beyond 5-6 public methods, consider splitting it

### Avoid Deep Nesting

- Max 2-3 levels of nesting (if/for/try)
- Extract early returns for guard clauses
- Prefer `async/await` over `.then()` chains

```typescript
// ✅ Early return guard clauses
if (!user) throw new NotFoundException('User', userId);
if (!user.isActive) throw new BusinessException('ACCOUNT_INACTIVE', 'Account is deactivated');
// ... proceed with happy path
```
