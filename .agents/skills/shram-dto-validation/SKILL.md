---
name: shram-dto-validation
description: >-
  Use this skill when creating Zod DTOs, validation middleware, and mapper
  classes in SHRAM. Covers DTO file patterns, query param validation, mapper
  (Prisma model → response DTO), and the validate() middleware. Activate when:
  user asks about input validation, DTO creation, or transforming Prisma
  models to API response shapes.
---

# SHRAM — DTO Validation & Mapper Pattern

## DTO File Structure

```typescript
// modules/bookings/dto/CreateBooking.dto.ts
import { z } from 'zod';

export const CreateBookingSchema = z.object({
  workerId: z.string().uuid('Worker ID must be a valid UUID'),
  skillId: z.string().uuid('Skill ID must be a valid UUID'),
  scheduledAt: z.coerce.date().refine(
    d => d > new Date(),
    'Scheduled time must be in the future'
  ),
  durationHours: z.number().positive().max(24, 'Duration cannot exceed 24 hours'),
  address: z.object({
    placeId: z.string().min(1, 'Place ID is required'),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    formattedAddress: z.string().min(1).max(500),
  }),
  notes: z.string().max(500).optional(),
});

export type CreateBookingDto = z.infer<typeof CreateBookingSchema>;

// Update DTO — all fields optional
export const UpdateBookingSchema = CreateBookingSchema.partial().pick({
  scheduledAt: true,
  durationHours: true,
  notes: true,
});

export type UpdateBookingDto = z.infer<typeof UpdateBookingSchema>;
```

## Query Params Validation

```typescript
// modules/bookings/dto/FilterBookings.dto.ts
export const FilterBookingsSchema = z.object({
  status: z.nativeEnum(BookingStatus).optional(),
  type: z.nativeEnum(BookingType).optional(),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type FilterBookingsDto = z.infer<typeof FilterBookingsSchema>;
```

## Validation Middleware

```typescript
// middleware/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationException } from '../core/exceptions/ValidationException.js';

export const validateBody = (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationException('Validation failed', result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })));
    }
    req.body = result.data;
    next();
  };

export const validateQuery = (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      throw new ValidationException('Invalid query parameters', result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })));
    }
    req.query = result.data as any;
    next();
  };

export const validateParams = (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      throw new ValidationException('Invalid path parameters', result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })));
    }
    next();
  };
```

## Usage in Routes

```typescript
// routes/booking.routes.ts
router.post(
  '/',
  authenticate,
  authorize(Role.PROVIDER),
  validateBody(CreateBookingSchema),
  bookingController.create,
);

router.get(
  '/',
  authenticate,
  validateQuery(FilterBookingsSchema),
  bookingController.list,
);

router.get(
  '/:id',
  authenticate,
  validateParams(z.object({ id: z.string().uuid() })),
  bookingController.getById,
);
```

## Mapper Pattern

Mappers transform Prisma models → clean API response DTOs. They live in `mappers/`.

```typescript
// modules/bookings/mappers/Booking.mapper.ts
import type { Booking, WorkerProfile, User, Payment } from '@prisma/client';

type BookingWithRelations = Booking & {
  worker: (WorkerProfile & { user: Pick<User, 'id' | 'name' | 'phone'> }) | null;
  payment: Payment | null;
};

export type BookingResponseDto = {
  id: string;
  type: string;
  status: string;
  estimatedFare: number;
  finalFare: number | null;
  scheduledAt: string;
  worker: { id: string; name: string; phone: string } | null;
  payment: { status: string; amount: number } | null;
  createdAt: string;
};

export class BookingMapper {
  static toResponse(booking: BookingWithRelations): BookingResponseDto {
    return {
      id: booking.id,
      type: booking.type,
      status: booking.status,
      estimatedFare: Number(booking.estimatedFare),
      finalFare: booking.finalFare ? Number(booking.finalFare) : null,
      scheduledAt: booking.scheduledAt?.toISOString() ?? '',
      worker: booking.worker
        ? {
            id: booking.worker.userId,
            name: booking.worker.user.name,
            phone: booking.worker.user.phone,
          }
        : null,
      payment: booking.payment
        ? { status: booking.payment.status, amount: Number(booking.payment.amount) }
        : null,
      createdAt: booking.createdAt.toISOString(),
    };
  }

  static toResponseList(bookings: BookingWithRelations[]): BookingResponseDto[] {
    return bookings.map(BookingMapper.toResponse);
  }
}
```

## Common Zod Utilities (shared/validators/)

```typescript
// shared/validators/common.schemas.ts
import { z } from 'zod';

export const uuidSchema = z.string().uuid('Invalid ID format');
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number');
export const emailSchema = z.string().email('Invalid email address').toLowerCase();
export const paginationSchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
});
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
```
