---
name: shram-rbac-middleware
description: >-
  Use this skill when implementing or modifying RBAC (Role-Based Access Control)
  in SHRAM: role guards, permission checks, policy classes, and how to protect
  routes. Activate when: user asks about authorization, protecting routes for
  specific roles, checking permissions in services, or implementing policy
  classes (e.g., can a worker cancel a booking?).
---

# SHRAM — RBAC & Authorization

## Roles

```typescript
// core/enums/Role.ts
export enum UserRole {
  PROVIDER = 'PROVIDER',
  WORKER = 'WORKER',
  AGENT = 'AGENT',
  ADMIN = 'ADMIN',
}
```

## Role Middleware

```typescript
// middleware/role.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AuthorizationException } from '../core/exceptions/AuthorizationException.js';
import { UserRole } from '../core/enums/Role.js';

export const authorize = (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new AuthorizationException('Not authenticated');
    if (!roles.includes(req.user.role as UserRole)) {
      throw new AuthorizationException(
        `Access denied. Required roles: [${roles.join(', ')}]`
      );
    }
    next();
  };

// Usage
router.post('/bookings', authenticate, authorize(UserRole.PROVIDER), validateBody(CreateBookingSchema), ctrl.create);
router.get('/admin/users', authenticate, authorize(UserRole.ADMIN), ctrl.listUsers);
router.post('/jobs/:id/apply', authenticate, authorize(UserRole.WORKER), ctrl.apply);
```

## Permission Constants (per module)

```typescript
// modules/bookings/permissions/booking.permissions.ts
export const BookingPermissions = {
  CREATE: 'booking:create',
  VIEW_OWN: 'booking:view:own',
  VIEW_ALL: 'booking:view:all',       // Admin only
  CANCEL_AS_PROVIDER: 'booking:cancel:provider',
  CANCEL_AS_WORKER: 'booking:cancel:worker',
  ASSIGN_WORKER: 'booking:assign:worker',   // Agent/Admin
  VIEW_HISTORY: 'booking:history:view',
} as const;

export const ROLE_BOOKING_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.PROVIDER]: [
    BookingPermissions.CREATE,
    BookingPermissions.VIEW_OWN,
    BookingPermissions.CANCEL_AS_PROVIDER,
  ],
  [UserRole.WORKER]: [
    BookingPermissions.VIEW_OWN,
    BookingPermissions.CANCEL_AS_WORKER,
  ],
  [UserRole.AGENT]: [
    BookingPermissions.VIEW_OWN,
    BookingPermissions.ASSIGN_WORKER,
    BookingPermissions.VIEW_HISTORY,
  ],
  [UserRole.ADMIN]: Object.values(BookingPermissions),
};
```

## Policy Classes

Policies encapsulate complex authorization rules that go beyond simple role checks.

```typescript
// modules/bookings/policies/BookingPolicy.ts
export class BookingPolicy {
  // Can this user view this booking?
  static canView(user: AuthUser, booking: Booking): boolean {
    if (user.role === UserRole.ADMIN || user.role === UserRole.AGENT) return true;
    return booking.providerId === user.id || booking.workerId === user.id;
  }

  // Can this user cancel this booking?
  static canCancel(user: AuthUser, booking: Booking): boolean {
    if (booking.status === BookingStatus.CLOSED) return false;
    if (booking.status === BookingStatus.WORK_STARTED) return false; // too late
    if (user.role === UserRole.PROVIDER) return booking.providerId === user.id;
    if (user.role === UserRole.WORKER) return booking.workerId === user.id;
    return user.role === UserRole.ADMIN;
  }

  // Can a review be submitted for this booking?
  static canReview(user: AuthUser, booking: Booking): boolean {
    if (booking.status !== BookingStatus.WORK_COMPLETED) return false;
    return booking.providerId === user.id || booking.workerId === user.id;
  }
}
```

```typescript
// Using policy in service
async cancelBooking(userId: string, bookingId: string, reason: string): Promise<void> {
  const booking = await this.bookingRepo.findById(bookingId);
  if (!booking) throw new NotFoundException('Booking', bookingId);

  const user = { id: userId, role: this.authContext.role };
  if (!BookingPolicy.canCancel(user, booking)) {
    throw new AuthorizationException('You cannot cancel this booking');
  }

  const toStatus = user.role === UserRole.PROVIDER
    ? BookingStatus.CANCELLED_BY_PROVIDER
    : BookingStatus.CANCELLED_BY_WORKER;

  await this.bookingStateService.transition(bookingId, toStatus, { changedBy: userId, reason });
}
```

## Route Protection Examples

```typescript
// modules/admin/routes/admin.routes.ts
router.get('/users', authenticate, authorize(UserRole.ADMIN), adminController.listUsers);
router.put('/settings/:key', authenticate, authorize(UserRole.ADMIN), validateBody(UpdateSettingSchema), adminController.updateSetting);
router.get('/analytics', authenticate, authorize(UserRole.ADMIN, UserRole.AGENT), adminController.getAnalytics);

// modules/bookings/routes/booking.routes.ts
router.post('/', authenticate, authorize(UserRole.PROVIDER), validateBody(CreateBookingSchema), bookingController.create);
router.get('/', authenticate, bookingController.list); // service filters by role
router.get('/:id', authenticate, validateParams(IdParamSchema), bookingController.getById); // policy check inside service
router.patch('/:id/cancel', authenticate, validateBody(CancelBookingSchema), bookingController.cancel); // policy in service
```

## ADMIN Route Protection Convention

Any `/admin/*` route requires both `authenticate` AND `authorize(UserRole.ADMIN)`. No exceptions.
