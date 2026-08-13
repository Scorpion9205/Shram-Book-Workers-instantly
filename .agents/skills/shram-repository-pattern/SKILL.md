---
name: shram-repository-pattern
description: >-
  Use this skill when implementing or refactoring the Repository pattern in SHRAM:
  creating repository classes, handling Prisma transactions, mocking repositories
  in tests, and BaseRepository utilities. Activate when: user asks about data
  access layer, prisma query patterns, or how to structure database calls.
---

# SHRAM — Repository Pattern

## Repository Pattern Principles

1. **Interface first** — define `IXxxRepository` before implementation
2. **Prisma only** — no business logic, no event publishing, no cache access
3. **Null-safe** — find methods return `T | null`, never throw for "not found"
4. **Prisma errors wrapped** — catch `PrismaClientKnownRequestError`, rethrow typed exceptions
5. **Transaction-aware** — accept optional `tx` param for transactional operations

## Full Repository Example

```typescript
// modules/bookings/repositories/BookingRepository.ts
import { Booking, Prisma, BookingStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import { DatabaseException, ConflictException, NotFoundException } from '../../../core/exceptions/index.js';
import type { IBookingRepository } from '../interfaces/IBookingRepository.js';
import type { CreateBookingData, UpdateBookingData, BookingFilter } from '../types/BookingTypes.js';

type PrismaTx = Prisma.TransactionClient;

export class BookingRepository extends BaseRepository<Booking> implements IBookingRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string, tx?: PrismaTx): Promise<Booking | null> {
    const client = tx ?? this.prisma.client;
    return client.booking.findUnique({
      where: { id },
      include: {
        provider: { include: { user: { select: { id: true, name: true, phone: true } } } },
        worker: { include: { user: { select: { id: true, name: true, phone: true } } } },
        payment: true,
        statusHistory: { orderBy: { changedAt: 'desc' } },
      },
    });
  }

  async findManyByFilter(filter: BookingFilter): Promise<{ items: Booking[]; total: number }> {
    const where = this.buildWhereClause(filter);
    const skip = this.buildSkip(filter.page, filter.limit);

    const [items, total] = await Promise.all([
      this.prisma.client.booking.findMany({
        where,
        skip,
        take: filter.limit,
        orderBy: { createdAt: 'desc' },
        include: { payment: { select: { status: true } } },
      }),
      this.prisma.client.booking.count({ where }),
    ]);

    return { items, total };
  }

  async create(data: CreateBookingData, tx?: PrismaTx): Promise<Booking> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.booking.create({ data });
    } catch (e) {
      this.handlePrismaError(e, 'Booking');
    }
  }

  async updateStatus(id: string, status: BookingStatus, tx?: PrismaTx): Promise<Booking> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.booking.update({ where: { id }, data: { status } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException('Booking', id);
      }
      this.handlePrismaError(e, 'Booking');
    }
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.client.booking.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private buildWhereClause(filter: BookingFilter): Prisma.BookingWhereInput {
    return {
      ...(filter.providerId && { providerId: filter.providerId }),
      ...(filter.workerId && { workerId: filter.workerId }),
      ...(filter.status && { status: filter.status }),
      ...(filter.type && { type: filter.type }),
      deletedAt: null,
    };
  }

  private handlePrismaError(e: unknown, resource: string): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        throw new ConflictException(`${resource} already exists`);
      }
    }
    throw new DatabaseException(`Failed to operate on ${resource}`, e);
  }
}
```

## Prisma Transactions in Service Layer

```typescript
// In BookingService — transaction spans multiple repos
async createBookingFromJob(applicationId: string): Promise<Booking> {
  return this.prisma.transaction(async (tx) => {
    // 1. Get the application (in tx)
    const application = await this.jobApplicationRepo.findById(applicationId, tx);
    if (!application) throw new NotFoundException('JobApplication', applicationId);

    // 2. Create the booking (in tx)
    const booking = await this.bookingRepo.create({
      type: BookingType.NORMAL_JOB,
      providerId: application.job.providerId,
      workerId: application.workerId,
      skillId: application.job.skillId,
      estimatedFare: application.proposedFare,
    }, tx);

    // 3. Update application status (in tx)
    await this.jobApplicationRepo.updateStatus(applicationId, ApplicationStatus.ACCEPTED, tx);

    // 4. Close other applications for this job (in tx)
    await this.jobApplicationRepo.rejectOtherApplications(application.jobId, applicationId, tx);

    return booking;
  });
}
```

## PrismaService

```typescript
// database/prisma/prisma.service.ts
import { PrismaClient } from '@prisma/client';
import { env } from '../../config/env.js';

export class PrismaService {
  private static instance: PrismaService;
  readonly client: PrismaClient;

  private constructor() {
    this.client = new PrismaClient({
      log: env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
    });
  }

  static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
  }

  async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.client.$transaction(fn);
  }

  async connect(): Promise<void> {
    await this.client.$connect();
  }

  async disconnect(): Promise<void> {
    await this.client.$disconnect();
  }
}
```
