# SHRAM Coding Rules — No Hardcoding

## Rule 01: Nothing is Hardcoded That Admin Can Manage

The backend is the single source of truth. **Nothing** that Admin can configure lives in source code.

### What Must Come From the Database / Config

| Item | Where it lives |
|---|---|
| Skill names, categories | `Skill`, `Category` Prisma models |
| Base rates, rate units | `Skill.baseRate`, `Skill.rateUnit` |
| Platform commission % | `PlatformSetting` table, key: `commissionPercent` |
| Instant-request radius tiers | `PlatformSetting.instantRequestRadiusTiers` (JSON array) |
| Pricing multipliers | `PricingRule` / `Multiplier` tables |
| Notification templates (subject/body) | `NotificationTemplate` table |
| OTP expiry, max attempts | `PlatformSetting` or well-named config constants (not magic numbers) |
| Booking timeouts, review edit window | `PlatformSetting` |

### ✅ CORRECT

```typescript
// Read from DB/cache
const setting = await this.platformSettingRepo.get('commissionPercent');
const commission = Number(setting.value);

// Named constants (compile-time, not business-configurable)
export const ACCESS_TOKEN_EXPIRY = '15m'; // in auth/constants/
```

### ❌ WRONG

```typescript
// ❌ hardcoded commission rate
const commission = 0.15;

// ❌ hardcoded tier values
const radiusTiers = [2, 5, 10];

// ❌ hardcoded OTP email body
const body = `Your OTP is ${otp}`;
```

### Enforcement

- `PlatformSetting` is a key-value table: `{ key: string, value: Json }`
- Always cache `PlatformSetting` reads in Redis (short TTL ~60s); invalidate on admin update
- Notification body/subject always resolved from `NotificationTemplate` at dispatch time
