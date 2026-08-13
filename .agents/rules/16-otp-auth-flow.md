# SHRAM Coding Rules — OTP-First Auth Flow

## Rule 16: Primary Auth Is OTP-First — Password Login Is Admin/Agent Only

Provider and Worker onboarding and login uses **OTP only** (email or SMS). Password login is reserved for Admin and Agent back-office accounts. This matches the spec.

### Auth Flow Summary

```
Registration / Login (same flow):
1. User selects channel (EMAIL | SMS) + enters identifier
2. POST /auth/otp/request { channel, identifier }
   → Backend creates Otp record + sends code via channel
3. POST /auth/otp/verify { channel, identifier, code }
   → Backend verifies hash + expiry + attempts
   → If no User exists → create User + profile (in transaction)
   → Issue JWT access + refresh tokens

Google OAuth (/auth/google):
1. Verify Google ID token
2. Upsert User by googleId / email
3. Issue same JWT pair
4. NO OTP step
```

### OTP Record Contract

- OTP code is **hashed** (Argon2) before storage — never stored in plaintext
- `expiresAt`: 5 minutes from creation
- `attempts`: locked after N failed attempts (from `PlatformSetting.otpMaxAttempts`)
- `consumedAt`: set on successful verify — marks it as used (prevents replay)
- Strict channel match: EMAIL OTP → email only; PHONE/SMS OTP → SMS only
- Rate-limited: max 1 request per 30s per identifier, max 5/hour

### Work-Start OTP (Booking)

When a booking reaches `WORKER_EN_ROUTE`:
- A **separate** OTP is generated with `purpose: WORK_START` + `bookingId` reference
- Sent via SMS to Provider's phone
- Provider reads code aloud to Worker who enters it to start work
- On verify: `BookingStateService.transition(bookingId, OTP_VERIFIED)`
- This OTP has no relation to auth OTP

### ❌ WRONG Patterns

```typescript
// ❌ Password login for Provider/Worker
if (user.role === 'PROVIDER') {
  const valid = await bcrypt.compare(password, user.passwordHash);
}

// ❌ Storing OTP in plaintext
await otpRepo.create({ code: otp, identifier }); // must be hashed

// ❌ Reusing consumed OTP
const otp = await otpRepo.findLatest(identifier);
if (otp.code === inputCode) { ... } // must check consumedAt

// ❌ Same endpoint for auth OTP and work-start OTP
// They are separate flows with separate Otp records and separate purposes
```

### Argon2 for Password Hashing

Admin and Agent passwords use **Argon2id** (not bcrypt):
```typescript
import argon2 from 'argon2';
const hash = await argon2.hash(password, { type: argon2.argon2id });
const valid = await argon2.verify(hash, password);
```
