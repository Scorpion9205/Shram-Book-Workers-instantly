# SHRAM Coding Rules — Barrel Exports via index.ts

## Rule 14: Every Module Exports Through index.ts

Every module has an `index.ts` at its root that re-exports everything the module exposes. Import consumers always import from `@modules/auth` (barrel), not from deep paths.

### ✅ CORRECT

```typescript
// modules/auth/index.ts
export { AuthController } from './controllers/AuthController.js';
export { AuthService } from './services/AuthService.js';
export { OTPService } from './services/OTPService.js';
export { TokenService } from './services/TokenService.js';
export { AuthRepository } from './repositories/AuthRepository.js';
export { OTPRepository } from './repositories/OTPRepository.js';
export type { IAuthService } from './interfaces/IAuthService.js';
export type { IAuthRepository } from './interfaces/IAuthRepository.js';
export type { ITokenPayload } from './interfaces/ITokenPayload.js';
export { OTPPurpose, OTPChannel, TokenType, AuthProvider } from './enums/index.js';
export { AUTH_CONSTANTS, JWT_CONSTANTS, OTP_CONSTANTS } from './constants/index.js';
export * from './routes/auth.routes.js';
```

```typescript
// Consuming from another module — always use barrel
import { type IUserRepository } from '../users/index.js';
import { BookingStatus } from '../bookings/index.js';
```

### ❌ WRONG — Deep imports

```typescript
// ❌ Deep path import from another module
import { UserRepository } from '../users/repositories/UserRepository.js';
import { BookingStatus } from '../bookings/enums/BookingStatus.js';
```

### enums/index.ts Pattern

If a module has multiple enum files, barrel them:

```typescript
// auth/enums/index.ts
export { OTPPurpose } from './OTPPurpose.js';
export { OTPChannel } from './OTPChannel.js';
export { TokenType } from './TokenType.js';
export { AuthProvider } from './AuthProvider.js';
```

### Module Registration

The main `app.ts` / `bootstrap` only imports from module `index.ts` to mount routes:

```typescript
// app.ts
import { authRouter } from '../modules/auth/index.js';
import { bookingRouter } from '../modules/bookings/index.js';

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/bookings', bookingRouter);
```
