# SHRAM Coding Rules — No Raw SQL

## Rule 15: All Database Access Is Through Prisma ORM

No raw SQL strings anywhere in the codebase. All queries go through the Prisma type-safe client. This includes not using `$queryRaw` except for rare performance-critical cases approved explicitly.

### ✅ CORRECT

```typescript
// Type-safe Prisma queries
const bookings = await this.prisma.client.booking.findMany({
  where: {
    providerId: userId,
    status: { in: [BookingStatus.CREATED, BookingStatus.PAYMENT_PENDING] },
    createdAt: { gte: startDate },
  },
  include: {
    worker: { select: { userId: true, user: { select: { name: true, phone: true } } } },
    payment: { select: { status: true, amount: true } },
    statusHistory: { orderBy: { changedAt: 'desc' }, take: 1 },
  },
  orderBy: { createdAt: 'desc' },
  skip: pagination.skip,
  take: pagination.limit,
});
```

### ❌ WRONG

```typescript
// ❌ Raw SQL
const result = await prisma.$queryRaw`SELECT * FROM bookings WHERE provider_id = ${userId}`;

// ❌ String interpolation in queries (SQL injection risk)
const result = await prisma.$executeRaw(`UPDATE users SET status = '${status}' WHERE id = '${id}'`);
```

### Prisma Schema Conventions

- All models use `@id @default(uuid())` — no auto-increment integer IDs
- All timestamps: `createdAt DateTime @default(now())` + `updatedAt DateTime @updatedAt`
- Soft deletes: `deletedAt DateTime?` — never hard-delete user or booking records
- All string fields that are identifiers: `@unique`
- All relation fields: explicit `@relation(fields: [...], references: [...])`
- All decimal money fields: `Decimal` type (never `Float` for money)
- Enums defined in Prisma schema match TypeScript enums in `enums/` folders exactly

### Migration Workflow

```bash
# Create a new migration (never edit existing migrations)
npx prisma migrate dev --name add_booking_otp_field

# Deploy in production
npx prisma migrate deploy

# Never use prisma db push in production
```
