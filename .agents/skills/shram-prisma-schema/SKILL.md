---
name: shram-prisma-schema
description: >-
  Use this skill when working with the Prisma schema in SHRAM: model conventions,
  aggregate root relationships, migration workflow, seeding, and the core models
  (User, Booking, Otp, Skill, Category, NotificationTemplate, PlatformSetting).
  Activate when: user asks about database schema, adding a new Prisma model,
  creating a migration, or understanding how models relate to each other.
---

# SHRAM — Prisma Schema Conventions

## Schema Conventions

1. All IDs: `String @id @default(uuid())` — no integer IDs
2. All timestamps: `createdAt DateTime @default(now())` + `updatedAt DateTime @updatedAt`
3. Soft deletes: `deletedAt DateTime?` on User, Booking, Job records
4. Money/decimal: `Decimal` type — never `Float`
5. Enums in Prisma match TypeScript enums exactly (same name, same values)
6. All unique identifiers: `@unique`
7. All foreign keys: explicit `@relation(fields: [...], references: [...])`
8. One-to-one optional relations: nullable side holds the foreign key

## Core Schema (abbreviated — reference only)

```prisma
// database/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  PROVIDER
  WORKER
  AGENT
  ADMIN
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum BookingStatus {
  CREATED
  PAYMENT_PENDING
  PAYMENT_CONFIRMED
  WORKER_ASSIGNED
  WORKER_EN_ROUTE
  OTP_VERIFIED
  WORK_STARTED
  WORK_COMPLETED
  PAYMENT_SETTLED
  REVIEWED
  CLOSED
  CANCELLED_BY_PROVIDER
  CANCELLED_BY_WORKER
  EXPIRED
  DISPUTED
}

enum BookingType {
  NORMAL_JOB
  INSTANT_REQUEST
  INSTANT_BIDDING
}

enum OtpPurpose {
  LOGIN
  WORK_START
  RESET_PASSWORD
}

enum OtpChannel {
  EMAIL
  SMS
}

enum RateUnit {
  HOURLY
  DAILY
  FIXED
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

model User {
  id           String      @id @default(uuid())
  role         UserRole
  name         String
  email        String?     @unique
  phone        String?     @unique
  passwordHash String?
  googleId     String?     @unique
  status       UserStatus  @default(ACTIVE)
  isVerified   Boolean     @default(false)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  deletedAt    DateTime?

  provider     ProviderProfile?
  worker       WorkerProfile?
  agent        AgentProfile?
}

model ProviderProfile {
  id        String   @id @default(uuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id])
  bio       String?
  avatarUrl String?
  city      String?
  state     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  bookings  Booking[]
}

model WorkerProfile {
  id          String        @id @default(uuid())
  userId      String        @unique
  user        User          @relation(fields: [userId], references: [id])
  bio         String?
  avatarUrl   String?
  city        String?
  state       String?
  isAvailable Boolean       @default(false)
  latitude    Decimal?
  longitude   Decimal?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  skills      WorkerSkill[]
  bookings    Booking[]
}

model Skill {
  id         String    @id @default(uuid())
  name       String
  categoryId String
  category   Category  @relation(fields: [categoryId], references: [id])
  baseRate   Decimal
  rateUnit   RateUnit
  status     String    @default("ACTIVE")
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  workers    WorkerSkill[]
}

model Category {
  id        String   @id @default(uuid())
  name      String   @unique
  status    String   @default("ACTIVE")
  createdAt DateTime @default(now())

  skills    Skill[]
}

model WorkerSkill {
  workerId  String
  skillId   String
  worker    WorkerProfile @relation(fields: [workerId], references: [id])
  skill     Skill         @relation(fields: [skillId], references: [id])
  yearsExp  Int?

  @@id([workerId, skillId])
}

model Booking {
  id             String        @id @default(uuid())
  type           BookingType
  providerId     String
  workerId       String?
  skillId        String
  status         BookingStatus @default(CREATED)
  estimatedFare  Decimal
  finalFare      Decimal?
  scheduledAt    DateTime?
  durationHours  Decimal?
  latitude       Decimal?
  longitude      Decimal?
  address        Json?
  notes          String?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  deletedAt      DateTime?

  provider       ProviderProfile  @relation(fields: [providerId], references: [id])
  worker         WorkerProfile?   @relation(fields: [workerId], references: [id])
  statusHistory  BookingStatusHistory[]
  payment        Payment?
  reviews        Review[]
  chatThread     ChatThread?
  otps           Otp[]
}

model BookingStatusHistory {
  id         String        @id @default(uuid())
  bookingId  String
  booking    Booking       @relation(fields: [bookingId], references: [id])
  fromStatus BookingStatus
  toStatus   BookingStatus
  changedBy  String
  reason     String?
  changedAt  DateTime      @default(now())
}

model Otp {
  id          String      @id @default(uuid())
  purpose     OtpPurpose
  channel     OtpChannel
  identifier  String
  codeHash    String
  attempts    Int         @default(0)
  consumedAt  DateTime?
  expiresAt   DateTime
  bookingId   String?
  booking     Booking?    @relation(fields: [bookingId], references: [id])
  createdAt   DateTime    @default(now())
}

model NotificationTemplate {
  id        String   @id @default(uuid())
  type      String
  channel   String
  locale    String   @default("en")
  subject   String?
  body      String
  variables Json?    // list of variable names in the template
  updatedAt DateTime @updatedAt

  @@unique([type, channel, locale])
}

model PlatformSetting {
  key       String   @id
  value     Json
  updatedAt DateTime @updatedAt
}
```

## Migration Workflow

```bash
# 1. Modify schema.prisma

# 2. Create migration (dev only)
npx prisma migrate dev --name describe_your_change

# 3. Apply in production
npx prisma migrate deploy

# 4. After adding new models, regenerate client
npx prisma generate

# Never: npx prisma db push in production
```

## Seed Script Pattern

```typescript
// database/seed/index.ts
async function seed() {
  // Always upsert, never insert-only — safe to re-run
  await prisma.category.upsert({
    where: { name: 'Cleaning' },
    update: {},
    create: { name: 'Cleaning', status: 'ACTIVE' },
  });

  // Seed default PlatformSettings
  await prisma.platformSetting.upsert({
    where: { key: 'commissionPercent' },
    update: {},
    create: { key: 'commissionPercent', value: 15 },
  });

  await prisma.platformSetting.upsert({
    where: { key: 'instantRequestRadiusTiers' },
    update: {},
    create: { key: 'instantRequestRadiusTiers', value: [2, 5, 10] },
  });
}
```
