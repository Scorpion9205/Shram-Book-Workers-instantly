# SHRAM Coding Rules — Exception Hierarchy

## Rule 05: All Errors Must Extend AppException

No raw `throw new Error('string')` anywhere in the codebase. Every thrown error is a typed exception that extends `AppException`.

### Exception Hierarchy

```
AppException (base)
 ├── ValidationException       (400) — invalid input, Zod failures
 ├── AuthenticationException   (401) — not logged in, bad token
 ├── AuthorizationException    (403) — insufficient role/permission
 ├── NotFoundException         (404) — entity not found
 ├── ConflictException         (409) — duplicate, already exists
 ├── BusinessException         (422) — rule violated (e.g., booking already cancelled)
 ├── PaymentException          (402) — payment-specific failures
 ├── TooManyRequestsException  (429) — rate limit hit
 └── DatabaseException         (500) — Prisma/DB infrastructure errors
```

### ✅ CORRECT

```typescript
// In service
const user = await this.userRepo.findById(userId);
if (!user) throw new NotFoundException('User', userId);

// In booking service
if (booking.status !== BookingStatus.PAYMENT_CONFIRMED) {
  throw new BusinessException(
    'INVALID_BOOKING_STATE',
    `Cannot assign worker when booking is in ${booking.status} state`,
  );
}

// In repository (wrapping Prisma)
try {
  return await this.prisma.client.user.create({ data });
} catch (e) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    throw new ConflictException('User with this email already exists');
  }
  throw new DatabaseException('Failed to create user', e);
}
```

### ❌ WRONG

```typescript
throw new Error('User not found');                  // ❌ raw Error
throw new Error('Account is deactivated');          // ❌ raw Error
if (!user) { res.status(404).json({...}); return; } // ❌ manual error response in service
```

### AppException Shape

```typescript
export abstract class AppException extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;
  readonly details?: unknown;
}
```

### GlobalErrorHandler

The single `error.middleware.ts` (`GlobalErrorHandler`) catches all `AppException` subclasses and maps them to the standard response envelope. Stack traces never leak to the client.
