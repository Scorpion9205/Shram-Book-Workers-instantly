# SHRAM Coding Rules — Naming Conventions

## Rule 13: File and Class Naming Conventions

Consistent naming across the entire codebase. Follow these exactly during the refactor.

### File Naming

| Type | Pattern | Example |
|---|---|---|
| Controller | `XxxController.ts` | `AuthController.ts` |
| Service | `XxxService.ts` | `OTPService.ts` |
| Repository | `XxxRepository.ts` | `UserRepository.ts` |
| Interface (Service) | `IXxxService.ts` | `IAuthService.ts` |
| Interface (Repo) | `IXxxRepository.ts` | `IUserRepository.ts` |
| DTO | `XxxAction.dto.ts` | `CreateBooking.dto.ts`, `RequestOTP.dto.ts` |
| Entity | `Xxx.entity.ts` | `User.entity.ts` |
| Mapper | `Xxx.mapper.ts` | `Booking.mapper.ts` |
| Enum | `XxxEnum.ts` or descriptive name | `BookingStatus.ts`, `OTPPurpose.ts` |
| Type | `Xxx.type.ts` or descriptive | `AuthUser.ts`, `JWTPayload.ts` |
| Helper | `camelCase.helper.ts` | `generateOtp.helper.ts` |
| Util | `camelCase.util.ts` | `jwt.util.ts`, `hash.util.ts` |
| Route | `xxx.routes.ts` | `auth.routes.ts` |
| Middleware | `xxx.middleware.ts` | `auth.middleware.ts` |
| Event | `xxx.event.ts` | `booking-created.event.ts` |
| Constant | `xxx.constants.ts` | `auth.constants.ts`, `otp.constants.ts` |
| Test | `XxxService.test.ts` | `BookingService.test.ts` |
| Config | `xxx.config.ts` | `app.config.ts`, `redis.config.ts` |

### Class Naming

```typescript
// Controllers
export class AuthController extends BaseController { }
export class BookingController extends BaseController { }

// Services
export class AuthService implements IAuthService { }
export class OTPService implements IOTPService { }

// Repositories  
export class UserRepository extends BaseRepository<User> implements IUserRepository { }

// Exceptions
export class BookingNotFoundException extends NotFoundException { }
export class OTPExpiredException extends BusinessException { }

// DTOs (named after action, not entity)
export const RequestOTPSchema = z.object({ ... });
export type RequestOTPDto = z.infer<typeof RequestOTPSchema>;
```

### Enum Naming

```typescript
// Enums: PascalCase name, SCREAMING_SNAKE_CASE values
export enum BookingStatus {
  CREATED = 'CREATED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  WORKER_ASSIGNED = 'WORKER_ASSIGNED',
}

export enum OTPPurpose {
  LOGIN = 'LOGIN',
  WORK_START = 'WORK_START',
  RESET_PASSWORD = 'RESET_PASSWORD',
}

export enum OTPChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}
```

### Route URL Conventions

```
POST   /api/v1/auth/otp/request
POST   /api/v1/auth/otp/verify
POST   /api/v1/auth/token/refresh
DELETE /api/v1/auth/logout

GET    /api/v1/bookings
POST   /api/v1/bookings
GET    /api/v1/bookings/:id
PATCH  /api/v1/bookings/:id/cancel
PATCH  /api/v1/bookings/:id/assign-worker

GET    /api/v1/instant-requests
POST   /api/v1/instant-requests
POST   /api/v1/instant-requests/:id/accept
POST   /api/v1/instant-requests/:id/cancel
```

All routes: lowercase kebab-case, resource-first, action as sub-path.
