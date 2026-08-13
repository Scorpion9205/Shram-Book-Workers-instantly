---
name: shram-testing-strategy
description: >-
  Use this skill when writing tests for SHRAM: unit tests for services with
  mocked repositories, integration tests for routes, test factory patterns,
  mock setup, and the testing pyramid. Activate when: user asks how to test
  a service, controller, repository, or how to mock dependencies in SHRAM.
---

# SHRAM — Testing Strategy

## Testing Pyramid

```
         E2E (few — full flows)
        Integration (some — route layer)
       Unit (many — services, repositories)
```

## Unit Test Pattern (Service with Mocked Repository)

```typescript
// modules/bookings/tests/BookingService.test.ts
import { describe, it, expect, beforeEach, vi, type MockedObject } from 'vitest';
import { BookingService } from '../services/BookingService.js';
import type { IBookingRepository } from '../interfaces/IBookingRepository.js';
import type { IWorkerRepository } from '../../workers/interfaces/IWorkerRepository.js';
import type { IBookingStateService } from '../interfaces/IBookingStateService.js';
import type { IEventPublisher } from '../../../core/interfaces/IEventPublisher.js';
import { NotFoundException, AuthorizationException } from '../../../core/exceptions/index.js';
import { BookingFactory } from '../tests/factories/BookingFactory.js';

describe('BookingService', () => {
  let bookingService: BookingService;
  let bookingRepo: MockedObject<IBookingRepository>;
  let workerRepo: MockedObject<IWorkerRepository>;
  let bookingStateService: MockedObject<IBookingStateService>;
  let eventPublisher: MockedObject<IEventPublisher>;

  beforeEach(() => {
    bookingRepo = {
      findById: vi.fn(),
      findManyByFilter: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      softDelete: vi.fn(),
    };

    workerRepo = { findById: vi.fn(), /* ... */ };
    bookingStateService = { transition: vi.fn() };
    eventPublisher = { publish: vi.fn() };

    bookingService = new BookingService(
      bookingRepo, workerRepo, bookingStateService, eventPublisher
    );
  });

  describe('getById', () => {
    it('should return booking when user is the provider', async () => {
      const booking = BookingFactory.create({ providerId: 'user-123' });
      bookingRepo.findById.mockResolvedValue(booking);

      const result = await bookingService.getById('booking-1', 'user-123', 'PROVIDER');
      expect(result).toEqual(booking);
    });

    it('should throw NotFoundException when booking not found', async () => {
      bookingRepo.findById.mockResolvedValue(null);
      await expect(bookingService.getById('bad-id', 'user-1', 'PROVIDER'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw AuthorizationException when user is not the provider or worker', async () => {
      const booking = BookingFactory.create({ providerId: 'other-user' });
      bookingRepo.findById.mockResolvedValue(booking);

      await expect(bookingService.getById('booking-1', 'user-123', 'PROVIDER'))
        .rejects.toThrow(AuthorizationException);
    });
  });

  describe('cancel', () => {
    it('should transition to CANCELLED_BY_PROVIDER for provider', async () => {
      const booking = BookingFactory.create({ providerId: 'user-123', status: 'PAYMENT_CONFIRMED' });
      bookingRepo.findById.mockResolvedValue(booking);
      bookingStateService.transition.mockResolvedValue({ ...booking, status: 'CANCELLED_BY_PROVIDER' });

      await bookingService.cancel('user-123', 'booking-1', 'PROVIDER', 'Changed my mind');

      expect(bookingStateService.transition).toHaveBeenCalledWith(
        'booking-1',
        'CANCELLED_BY_PROVIDER',
        expect.objectContaining({ changedBy: 'user-123' })
      );
    });
  });
});
```

## Test Factory Pattern

```typescript
// modules/bookings/tests/factories/BookingFactory.ts
import { BookingStatus, BookingType } from '@prisma/client';

export class BookingFactory {
  static create(overrides: Partial<Booking> = {}): Booking {
    return {
      id: 'booking-test-' + Math.random().toString(36).slice(2),
      type: BookingType.NORMAL_JOB,
      providerId: 'provider-test-1',
      workerId: null,
      skillId: 'skill-test-1',
      status: BookingStatus.CREATED,
      estimatedFare: new Prisma.Decimal(500),
      finalFare: null,
      scheduledAt: new Date(Date.now() + 86400000),
      durationHours: new Prisma.Decimal(2),
      latitude: new Prisma.Decimal(12.9716),
      longitude: new Prisma.Decimal(77.5946),
      address: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      ...overrides,
    };
  }

  static createList(count: number, overrides: Partial<Booking> = {}): Booking[] {
    return Array.from({ length: count }, (_, i) =>
      BookingFactory.create({ ...overrides, id: `booking-test-${i}` })
    );
  }
}
```

## Integration Test Pattern (Route Layer)

```typescript
// modules/auth/tests/auth.integration.test.ts
import request from 'supertest';
import { createTestApp } from '../../../tests/helpers/createTestApp.js';
import { PrismaTestClient } from '../../../tests/helpers/PrismaTestClient.js';

describe('POST /api/v1/auth/otp/request', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await PrismaTestClient.cleanup(['otp']);
  });

  it('should return 200 and send OTP for valid email', async () => {
    const response = await request(app)
      .post('/api/v1/auth/otp/request')
      .send({ channel: 'EMAIL', identifier: 'test@example.com' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('OTP sent');
  });

  it('should return 429 when rate limit exceeded', async () => {
    // Hit the endpoint 6 times
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/v1/auth/otp/request')
        .send({ channel: 'EMAIL', identifier: 'ratelimit@example.com' });
    }

    const response = await request(app)
      .post('/api/v1/auth/otp/request')
      .send({ channel: 'EMAIL', identifier: 'ratelimit@example.com' })
      .expect(429);

    expect(response.body.errorCode).toBe('RATE_LIMIT_EXCEEDED');
  });
});
```

## Test Setup (vitest.config.ts)

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/modules/**/*.ts'],
      exclude: ['**/*.d.ts', '**/index.ts', '**/*.test.ts'],
    },
  },
});
```

## What to Test vs Not

| Test | What | Tools |
|---|---|---|
| Unit | Service methods with mocked repos | vitest + vi.fn() |
| Unit | OTPService.verify() logic | vitest |
| Unit | BookingStateService.validateTransition() | vitest |
| Integration | Route → Controller → Service → DB | supertest + test DB |
| E2E | Full booking flow (create → accept → OTP → complete) | supertest |
| Skip | Repository internals (Prisma handles those) | — |
| Skip | External provider calls (mock at provider level) | — |
