---
name: shram-class-oop
description: >-
  Use this skill when implementing OOP patterns in the SHRAM backend:
  BaseController, BaseService, BaseRepository, dependency injection,
  and the core/ base class hierarchy. Activate when: user asks how to
  write a controller/service/repository, refactoring static methods to
  class instances, or setting up the DI container.
---

# SHRAM — OOP Patterns & Base Classes

## Core Base Classes

### BaseController

```typescript
// core/base/BaseController.ts
import { Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { ValidationException } from '../exceptions/ValidationException.js';
import { ResponseBuilder } from '../responses/ResponseBuilder.js';
import type { PaginationMeta } from '../types/index.js';

export abstract class BaseController {
  protected ok<T>(res: Response, data: T, message: string): void {
    res.status(200).json(ResponseBuilder.success(data, message));
  }

  protected created<T>(res: Response, data: T, message: string): void {
    res.status(201).json(ResponseBuilder.success(data, message));
  }

  protected noContent(res: Response): void {
    res.status(204).send();
  }

  protected paginated<T>(
    res: Response,
    items: T[],
    meta: PaginationMeta,
    message: string,
  ): void {
    res.status(200).json(ResponseBuilder.success(items, message, meta));
  }

  protected async validate<T>(schema: ZodSchema<T>, data: unknown): Promise<T> {
    const result = schema.safeParse(data);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      throw new ValidationException('Validation failed', errors);
    }
    return result.data;
  }
}
```

### BaseService

```typescript
// core/base/BaseService.ts
import { Logger } from '../logger/Logger.js';

export abstract class BaseService {
  protected readonly logger: Logger;

  constructor(context: string) {
    this.logger = new Logger(context);
  }

  protected log(message: string, meta?: object): void {
    this.logger.info(message, meta);
  }

  protected logError(message: string, error: unknown): void {
    this.logger.error(message, error);
  }
}
```

### BaseRepository

```typescript
// core/base/BaseRepository.ts
import type { PrismaService } from '../../database/prisma/prisma.service.js';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export abstract class BaseRepository<T> {
  protected buildSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  protected buildPaginatedResult<T>(
    items: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResult<T> {
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
```

## Dependency Injection Pattern

SHRAM uses **manual constructor DI** (no framework like InversifyJS). Each module wires its own dependencies in `index.ts` or `bootstrap/`.

```typescript
// bootstrap/app.bootstrap.ts
export function wireModules(prisma: PrismaService, cache: ICacheService, ...): AppDependencies {
  // Providers (external adapters)
  const emailProvider: IEmailProvider = new ResendProvider(env.RESEND_API_KEY);
  const smsProvider: ISmsProvider = new ExotelProvider(env.EXOTEL_API_KEY, env.EXOTEL_API_TOKEN, env.EXOTEL_SID);
  const paymentProvider: IPaymentProvider = new RazorpayProvider(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET);
  const storageProvider: IStorageProvider = new S3Provider(env.AWS_REGION, env.AWS_S3_BUCKET);

  // Repositories
  const userRepo = new UserRepository(prisma);
  const otpRepo = new OTPRepository(prisma);
  const bookingRepo = new BookingRepository(prisma);
  const workerRepo = new WorkerRepository(prisma);

  // Services
  const tokenService = new TokenService(cache);
  const otpService = new OTPService(otpRepo, cache, emailProvider, smsProvider);
  const authService = new AuthService(userRepo, otpService, tokenService, cache);
  const bookingStateService = new BookingStateService(bookingRepo, eventPublisher, prisma);
  const bookingService = new BookingService(bookingRepo, workerRepo, pricingService, bookingStateService, eventPublisher);

  // Controllers
  const authController = new AuthController(authService);
  const bookingController = new BookingController(bookingService);

  return { authController, bookingController, /* ... */ };
}
```

## Arrow-Function Method Pattern (Required)

Use arrow function class fields for all route handler methods. This binds `this` correctly when Express calls the method.

```typescript
export class BookingController extends BaseController {
  constructor(private readonly bookingService: IBookingService) { super(); }

  // ✅ Arrow function — 'this' is always the class instance
  createBooking = async (req: Request, res: Response): Promise<void> => {
    const dto = await this.validate(CreateBookingSchema, req.body);
    const booking = await this.bookingService.create(req.user!.id, dto);
    this.created(res, booking, 'Booking created successfully');
  };

  // ❌ Regular method — 'this' breaks when passed as callback to router
  // async createBooking(req: Request, res: Response) { ... }
}
```
