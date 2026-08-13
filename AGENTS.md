# SHRAM — Project Coding Rules (Always Active)

This file applies to the entire SHRAM workspace. All rules below are ALWAYS active for every coding task in this project.

---

## Project Overview

SHRAM is a modular-monolith marketplace (Node.js + Express + TypeScript backend, Next.js frontend) connecting Providers with Workers. The **Booking** entity is the aggregate root of the entire domain.

**Tech Stack:**
- Backend: Node.js + Express 5 + TypeScript (strict mode)
- ORM: Prisma (PostgreSQL)
- Cache/Queue: Redis (ioredis) + RabbitMQ (amqplib)
- Real-time: Socket.IO with Redis adapter
- Auth: OTP-first (Argon2 hash for OTP codes + Argon2 for Admin/Agent passwords), JWT access+refresh
- Frontend: Next.js 15 + TypeScript + RTK Query + TailwindCSS

---

## Architecture Rules (Non-Negotiable)

### Layered Architecture (Backend)
```
Request → Route → Middleware (auth/validate) → Controller → Service → Repository → Prisma → DB
```
- **Controller**: parse + delegate + respond — NO business logic
- **Service**: ALL business logic — NO `req`/`res`/Express imports
- **Repository**: ONLY Prisma queries — NO business logic, fully mockable
- Every layer talks to the layer directly below it, never skipping layers

### OOP Mandatory
- Every Controller extends `BaseController`
- Every Service implements its `IXxxService` interface
- Every Repository extends `BaseRepository<T>` and implements `IXxxRepository`
- **No static methods** on Service/Repository classes
- **No naked exported async functions** as controllers/services

### Module Structure (15 folders)
Every module must have: `controllers/ services/ repositories/ routes/ dto/ validators/ entities/ mappers/ interfaces/ types/ constants/ enums/ events/ sockets/ helpers/ utils/ policies/ permissions/ tests/ index.ts`

---

## Critical Prohibitions

1. **No `throw new Error("string")`** — use typed `AppException` subclasses only
2. **No `prisma.*` in controllers or services** — only in Repository classes
3. **No `process.env.X`** inline — use typed `env` from `config/env.ts`
4. **No `res.json({...})`** in controllers manually — use `BaseController` helpers
5. **No `booking.status =`** anywhere except `BookingStateService.transition()`
6. **No hardcoded rates, templates, radius values** — always from DB/PlatformSetting
7. **No raw SQL** — all DB access through Prisma ORM
8. **No deep cross-module imports** — always through `index.ts` barrel
9. **No Redis direct access** — always through `CacheService` interface
10. **No inline side-effects** (email/SMS/push) in service methods — use RabbitMQ events (exception: OTP dispatch is synchronous)

---

## Response Format (Always)

```json
// success
{ "success": true, "message": "...", "data": {}, "meta": {} }
// error
{ "success": false, "message": "...", "errorCode": "...", "errors": [] }
```

---

## Naming (Quick Reference)

| File | Example |
|---|---|
| Controller | `BookingController.ts` |
| Service | `OTPService.ts` |
| Repository | `UserRepository.ts` |
| Interface | `IBookingService.ts`, `IUserRepository.ts` |
| DTO | `CreateBooking.dto.ts` |
| Enum | `BookingStatus.ts` |
| Route | `booking.routes.ts` |

---

## Auth Rules

- Provider/Worker login = **OTP only** (email or SMS, strictly channel-matched)
- Admin/Agent login = password (Argon2id)
- **Google OAuth** = separate path, no OTP
- OTP codes hashed with **Argon2id** before storage
- JWT: 15min access token + 7d refresh (httpOnly cookie)
- Work-start OTP = separate purpose (`WORK_START`), separate Otp record, sent to Provider's phone

---

## Available Skills (Read Before Implementing)

When working on these areas, activate the corresponding skill:

| Task | Skill to Activate |
|---|---|
| Create new module | `shram-module-scaffold` |
| OOP / base classes / DI | `shram-class-oop` |
| Error handling setup | `shram-error-handling` |
| Repository / Prisma | `shram-repository-pattern` |
| Zod DTOs / validation | `shram-dto-validation` |
| Booking state machine | `shram-booking-fsm` |
| Pricing engine | `shram-pricing-engine` |
| Instant request / geo | `shram-instant-request-flow` |
| RabbitMQ events | `shram-rabbitmq-events` |
| Auth / OTP flow | `shram-auth-otp-flow` |
| Socket.IO (backend) | `shram-socket-realtime` |
| Redis / CacheService | `shram-redis-cache` |
| API response format | `shram-api-response` |
| RBAC / permissions | `shram-rbac-middleware` |
| Prisma schema | `shram-prisma-schema` |
| Notifications | `shram-notification-dispatcher` |
| Testing | `shram-testing-strategy` |
| Config / bootstrap | `shram-config-management` |
| Frontend features | `shram-frontend-feature` |
| RTK Query | `shram-rtk-query` |
| Frontend Socket.IO | `shram-socket-client` |
| Address input (maps) | `shram-address-autocomplete` |
