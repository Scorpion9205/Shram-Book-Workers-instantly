# SHRAM Coding Rules — Zod Validation Is Mandatory

## Rule 11: Every Incoming Request Is Validated via Zod DTO Before the Controller Runs

No controller method ever accesses `req.body` raw. Every endpoint has a Zod schema (`dto/`) and a validation middleware that runs before the controller.

### DTO Location

```
module/
  dto/
    CreateXxx.dto.ts   ← Zod schema + inferred TypeScript type
    UpdateXxx.dto.ts
    FilterXxx.dto.ts
```

### DTO File Pattern

```typescript
// bookings/dto/CreateBooking.dto.ts
import { z } from 'zod';

export const CreateBookingSchema = z.object({
  workerId: z.string().uuid('Invalid worker ID'),
  skillId: z.string().uuid('Invalid skill ID'),
  scheduledAt: z.coerce.date().refine(d => d > new Date(), 'Must be a future date'),
  durationHours: z.number().positive().max(24),
  address: z.object({
    placeId: z.string().min(1),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    formattedAddress: z.string().min(1),
  }),
  notes: z.string().max(500).optional(),
});

export type CreateBookingDto = z.infer<typeof CreateBookingSchema>;
```

### Validation Middleware (validation.middleware.ts)

```typescript
// middleware/validate.middleware.ts
export const validate = (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      throw new ValidationException('Validation failed', errors);
    }
    req.body = result.data; // replace with parsed/coerced data
    next();
  };

// Usage in routes
router.post('/bookings', authenticate, authorize(Role.PROVIDER), validate(CreateBookingSchema), bookingController.create);
```

### Rules

- Schemas live in `dto/` — not in `validators/` (validators are Zod schemas too but for query params and complex cross-field rules)
- `req.params` and `req.query` also validated with separate Zod schemas before controllers
- Never use `req.body as SomeType` — always go through `validate()` middleware
- DTOs are the **only** TypeScript types passed between controller and service
- Services receive DTOs — never raw `any` or untyped objects
