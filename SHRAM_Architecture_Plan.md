# SHRAM — Full System Architecture Plan
### Worker Hiring & Booking Platform (Production-Grade)

---

## 1. Executive Summary

SHRAM is a modular-monolith marketplace connecting **Providers** (people who need work done) with **Workers** (skilled professionals), mediated by **Agents** and governed by **Admin**. It supports three hiring models — Normal Job, Instant Request, Instant Bidding — all converging into a single **Booking** entity that is the backbone of the entire system (payments, OTP, chat, reviews, notifications, timeline all reference it).

Core architectural commitments from the source docs, restated as engineering rules:

1. **Backend is the single source of truth** — pricing, payment confirmation, OTP verification never trust the client.
2. **Nothing is hardcoded that Admin can manage** — skills, categories, rates, multipliers, timeouts, templates all live in DB.
3. **Every module is self-contained and microservice-extractable** — Controller → Service → Repository → Prisma, per domain folder.
4. **Everything references Booking** — it is the aggregate root of the domain model.

---

## 2. High-Level Component Map

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENTS: Web (Next.js/Vercel)       │
└───────────────┬─────────────────────────┬────────────────────┘
                 │ HTTPS (REST)            │ WebSocket (Socket.IO)
                 ▼                         ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND — Node.js + Express + TypeScript (Modular Monolith) │
│  Modules: Auth, Users, Workers, Providers, Agents,            │
│  InstantRequests, Bidding, Jobs, Bookings, Payments, Chat,     │
│  Notifications, Reviews, Admin                                │
│  Cross-cutting: Validation, Sanitization, ErrorHandling,       │
│  Logging, RateLimiting, Idempotency, RBAC                     │
└───────┬─────────────┬─────────────┬─────────────┬────────────┘
        │              │             │             │
        ▼              ▼             ▼             ▼
  PostgreSQL        Redis        RabbitMQ        AWS S3
  (Prisma ORM)   (cache/geo/    (event queues,   (files/images)
   source of      sessions)      async workers)
   truth
        │
        ▼
  External services: Razorpay · Resend · Twilio/Exotel · FCM · Google Maps
```

---

## 3. Domain Model (Aggregate Roots & Relationships)

**Booking is the aggregate root.** Everything else attaches to it.

```
User (base identity)
 ├─ Provider profile
 ├─ Worker profile ── WorkerSkill[] ── Skill (admin-managed)
 ├─ Agent profile
 └─ Admin profile

Skill ── Category (admin-managed, never hardcoded)

Job (Normal Job posting)
 ├─ JobApplication[] ── submitted by Workers
 └─ → Booking (on selection)

InstantRequest
 ├─ status: PENDING → BROADCASTING → ACCEPTED → EXPIRED
 └─ → Booking (on acceptance)

 Instant request with real time bidding by multiple worker
 ├─ Bid[] ── submitted by Workers
 └─ → Booking (on selection)

Booking  ◄── the aggregate root
 ├─ BookingStatusHistory[] (timeline/audit trail)
 ├─ Otp (WORK_START verification)
 ├─ Payment / Invoice
 ├─ ChatThread ── Message[]
 ├─ Review (Provider→Worker, Worker→Provider)
 └─ Notification[] (fan-out log)

PricingRule / Multiplier (admin-managed: base rate, distance, weather, demand)
PlatformSetting (admin-managed: commission %, booking radius, IR timeout, etc.)
```

### Booking State Machine (the core FSM)

```
CREATED
  → PAYMENT_PENDING → PAYMENT_CONFIRMED
      → WORKER_ASSIGNED
          → WORKER_EN_ROUTE
              → OTP_VERIFIED → WORK_STARTED
                  → WORK_COMPLETED
                      → PAYMENT_SETTLED
                          → REVIEWED → CLOSED
  (branches): CANCELLED_BY_PROVIDER | CANCELLED_BY_WORKER | EXPIRED | DISPUTED (future)
```
Every transition is written through a `BookingStateService` using the **State/Strategy pattern**, each transition emits a domain event onto RabbitMQ (`booking.status_changed`) that fans out to Notification, Chat, and Analytics consumers. No controller mutates `booking.status` directly — ever.

---

---

## 3a. Authentication & OTP Login Flow

Primary login is **identifier + OTP**, not password-first. Google OAuth is a secondary path that skips OTP entirely. Argon2 password hashing stays in the schema for accounts that set a password (e.g. Admin/Agent back-office accounts), but Provider/Worker onboarding is OTP-only by default.

**Registration / Login (same endpoint, same flow):**
1. User picks a channel and enters an identifier: **email address** or **mobile number**.
2. `POST /auth/otp/request { channel: 'EMAIL' | 'PHONE', identifier }`
   - Backend creates an `Otp` record (`purpose: LOGIN`, `channel`, `identifier`, hashed code, `expiresAt`, attempt counter), rate-limited per identifier (e.g. 1 request per 30s, max 5/hour) to stop OTP-bombing.
   - **If channel is EMAIL** → dispatch through the `OTP_LOGIN` email template via Resend.
   - **If channel is PHONE** → dispatch an SMS through Exotel (behind the `SmsProvider` adapter — same interface used for booking notifications).
   - The OTP is never sent on both channels for one request — strictly channel-matched to what the user chose.
3. `POST /auth/otp/verify { channel, identifier, code }`
   - Backend checks the hashed code, expiry, and attempt count (lock after N failed attempts).
   - On success: if no `User` exists for that identifier, create one (role assigned during onboarding, not at this step); issue JWT access token (short-lived) + refresh token (httpOnly cookie, rotated).
   - OTP record is marked `consumed` — cannot be reused (prevents replay).
4. Google OAuth (`/auth/google`) is a fully separate strategy — verifies the Google ID token, upserts the `User` by `googleId`/email, issues the same JWT pair. No OTP step in this path.

when once booking is created send the new otp to the provider for worker arrival verification and then worker can start the work;



Minimum template set for MVP:

| Type | Channel(s) | Trigger |
|---|---|---|
| `OTP_LOGIN` | Email, SMS | Login/registration OTP request |
| `OTP_WORK_START` | SMS (to Provider, who reads it to Worker) | Worker arrives, booking → `WORKER_EN_ROUTE` |
| `WELCOME` | Email | First successful login/registration |
| `BOOKING_CREATED` | Email, Push | Booking created (any hiring model) |
| `BOOKING_CONFIRMED` | Email, SMS, Push | Payment confirmed / worker assigned |
| `WORK_STARTED` | Push | OTP verified, work begins |
| `WORK_COMPLETED` | Email, Push | Provider confirms completion |
| `PAYMENT_RECEIPT` | Email | Payment settled (with invoice attached/linked) |
| `BOOKING_CANCELLED` | Email, SMS, Push | Either party cancels |
| `REVIEW_REQUEST` | Push | Shortly after `WORK_COMPLETED`, before the 5-minute review-edit window closes |

Admin CRUDs these templates (subject/body/variables) from the Admin panel — the `admin/templates` module owns this, and `NotificationDispatcher` always resolves `(type, channel, locale)` → template at send time, never inlines copy.

---
You have to do class based coding and global error handling 


backend/
│
├── src/
│
├── main.ts
├── app.ts
│
├── bootstrap/
│   ├── app.bootstrap.ts
│   ├── express.bootstrap.ts
│   ├── prisma.bootstrap.ts
│   ├── redis.bootstrap.ts
│   ├── rabbitmq.bootstrap.ts
│   ├── socket.bootstrap.ts
│   ├── swagger.bootstrap.ts
│   └── scheduler.bootstrap.ts
│
├── config/
│   ├── app.config.ts
│   ├── auth.config.ts
│   ├── database.config.ts
│   ├── redis.config.ts
│   ├── rabbitmq.config.ts
│   ├── razorpay.config.ts
│   ├── google.config.ts
│   ├── email.config.ts
│   ├── sms.config.ts
│   ├── storage.config.ts
│   ├── socket.config.ts
│   ├── logger.config.ts
│   └── env.ts
│
├── core/
│   ├── base/
│   │   ├── BaseController.ts
│   │   ├── BaseService.ts
│   │   ├── BaseRepository.ts
│   │   ├── BaseValidator.ts
│   │   └── BaseEntity.ts
│   │
│   ├── container/
│   │   └── container.ts
│   │
│   ├── decorators/
│   │
│   ├── dto/
│   │
│   ├── enums/
│   │
│   ├── exceptions/
│   │   ├── ApiException.ts
│   │   ├── ValidationException.ts
│   │   ├── AuthenticationException.ts
│   │   ├── AuthorizationException.ts
│   │   ├── NotFoundException.ts
│   │   ├── ConflictException.ts
│   │   ├── BusinessException.ts
│   │   ├── PaymentException.ts
│   │   └── DatabaseException.ts
│   │
│   ├── interfaces/
│   │
│   ├── responses/
│   │   ├── ApiResponse.ts
│   │   └── ResponseBuilder.ts
│   │
│   ├── logger/
│   │   └── Logger.ts
│   │
│   ├── types/
│   │
│   └── utils/
│
├── database/
│   ├── prisma/
│   │   ├── prisma.service.ts
│   │   ├── prisma.client.ts
│   │   └── prisma.transaction.ts
│   │
│   ├── migrations/
│   ├── seed/
│   └── schema.prisma
│
├── middleware/
│   ├── auth.middleware.ts
│   ├── role.middleware.ts
│   ├── permission.middleware.ts
│   ├── validation.middleware.ts
│   ├── rateLimit.middleware.ts
│   ├── requestId.middleware.ts
│   ├── logger.middleware.ts
│   ├── error.middleware.ts
│   ├── upload.middleware.ts
│   ├── sanitize.middleware.ts
│   ├── cors.middleware.ts
│   └── helmet.middleware.ts
│
├── providers/
│   ├── email/
│   │   ├── EmailProvider.ts
│   │   └── ResendProvider.ts
│   │
│   ├── sms/
│   │   ├── SmsProvider.ts
│   │   └── ExotelProvider.ts
│   │
│   ├── payment/
│   │   ├── PaymentProvider.ts
│   │   └── RazorpayProvider.ts
│   │
│   ├── storage/
│   │   ├── StorageProvider.ts
│   │   └── S3Provider.ts
│   │
│   ├── maps/
│   │   ├── MapsProvider.ts
│   │   └── GoogleMapsProvider.ts
│   │
│   ├── push/
│   │   └── FirebaseProvider.ts
│   │
│   └── oauth/
│       └── GoogleOAuthProvider.ts
│
├── cache/
│   ├── RedisService.ts
│   ├── CacheService.ts
│   └── cacheKeys.ts
│
├── queues/
│   ├── connection/
│   ├── producers/
│   ├── consumers/
│   ├── exchanges/
│   ├── routing/
│   └── queue.constants.ts
│
├── socket/
│   ├── SocketServer.ts
│   ├── SocketGateway.ts
│   ├── socket.events.ts
│   ├── socket.rooms.ts
│   ├── socket.middleware.ts
│   └── handlers/
│
├── cron/
│   ├── booking.cron.ts
│   ├── payment.cron.ts
│   ├── cleanup.cron.ts
│   ├── notification.cron.ts
│   └── worker-status.cron.ts
│
├── events/
│   ├── booking.events.ts
│   ├── payment.events.ts
│   ├── notification.events.ts
│   ├── review.events.ts
│   └── user.events.ts
│
├── modules/
│
│   ├── auth/
│   ├── users/
│   ├── workers/
│   ├── providers/
│   ├── agents/
│   ├── admin/
│   ├── skills/
│   ├── categories/
│   ├── jobs/
│   ├── applications/
│   ├── bookings/
│   ├── instant-booking/
│   ├── bidding/
│   ├── pricing/
│   ├── payments/
│   ├── wallet/
│   ├── reviews/
│   ├── notifications/
│   ├── chat/
│   ├── files/
│   ├── analytics/
│   ├── reports/
│   ├── support/
│   ├── settings/
│   ├── location/
│   └── dashboard/
│
│   Every module contains:
│    i no need off any ffile don't take that

│   module/
│   │
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── routes/
│   ├── dto/
│   ├── validators/
│   ├── entities/
│   ├── mappers/
│   ├── interfaces/
│   ├── types/
│   ├── constants/
│   ├── enums/
│   ├── events/
│   ├── sockets/
│   ├── helpers/
│   ├── utils/
│   ├── policies/
│   ├── permissions/
│   ├── tests/
│   └── index.ts
│
├── shared/
│   ├── constants/
│   ├── enums/
│   ├── helpers/
│   ├── utils/
│   ├── validators/
│   ├── interfaces/
│   ├── types/
│   ├── permissions/
│   └── policies/
│
├── docs/
│   ├── swagger/
│   └── openapi/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── fixtures/
│   └── mocks/
│
├── uploads/
│
├── logs/
│
├── package.json
├── tsconfig.json
├── .env
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── README.md
├── eslint.config.js
├── prettier.config.js
└── nodemon.json

in each modules
auth/
│
├── controllers/
│   └── AuthController.ts
│
├── services/
│   ├── AuthService.ts
│   ├── OTPService.ts
│   ├── PasswordService.ts
│   └── TokenService.ts
│
├── repositories/
│   ├── AuthRepository.ts
│   └── OTPRepository.ts
│
├── dto/
│   ├── Login.dto.ts
│   ├── Signup.dto.ts
│   ├── VerifyOTP.dto.ts
│   └── ForgotPassword.dto.ts
│
├── validators/
│   ├── login.validator.ts
│   ├── signup.validator.ts
│   └── otp.validator.ts
│
├── routes/
│   └── auth.routes.ts
│
├── constants/
├── enums/
├── interfaces/
├── types/
├── helpers/
├── utils/
├── events/
├── sockets/
├── tests/
└── index.ts

📂 auth/constants/

Yahan fixed values rakho jo business me baar-baar use hongi.

Example:

auth/constants/

auth.constants.ts
jwt.constants.ts
otp.constants.ts
cookie.constants.ts

Example:

export const OTP_EXPIRY_MINUTES = 5;

export const MAX_OTP_ATTEMPTS = 5;

export const ACCESS_TOKEN_EXPIRY = "15m";

export const REFRESH_TOKEN_EXPIRY = "7d";
📂 auth/enums/

Yahan enums rahenge.

Example

export enum OTPPurpose {
  SIGNUP="SIGNUP",
  LOGIN="LOGIN",
  RESET_PASSWORD="RESET_PASSWORD",
  START_BOOKING="START_BOOKING"
}

Another

export enum TokenType{
   ACCESS="ACCESS",
   REFRESH="REFRESH"
}

Another

export enum AuthProvider{
   LOCAL="LOCAL",
   GOOGLE="GOOGLE"
}
📂 auth/interfaces/

Interfaces.

Example

IAuthRepository.ts

IAuthService.ts

ITokenPayload.ts

IOTPService.ts

Example

export interface ITokenPayload{

    id:string;

    email:string;

    role:Role;

}
📂 auth/types/

Small reusable TS types.

Example

AuthUser.ts

JWTPayload.ts

OTPData.ts

GoogleProfile.ts

Example

export type OTPData={

phone:string;

otp:string;

expiresAt:Date;

}
📂 auth/helpers/

Business helper functions.

Example

helpers/

generateOtp.ts

generateUsername.ts

normalizePhone.ts

maskPhone.ts

maskEmail.ts

buildTokenPayload.ts

Example

generateOTP()

generateRandomPassword()

normalizePhone()

maskPhone()


Ye sirf auth ke kaam ke helper functions hain.

📂 auth/utils/

Utilities.

Ye generic hote hain.

Example

utils/

jwt.util.ts

cookie.util.ts

hash.util.ts

otp.util.ts

Example

createAccessToken()

verifyAccessToken()

hashPassword()

comparePassword()

Difference:

Helper → Business helper

Utility → Generic reusable function

📂 auth/events/

RabbitMQ ya Internal Events

Example

events/

user-created.event.ts

otp-sent.event.ts

user-verified.event.ts

login-success.event.ts

password-reset.event.ts

Example

Event:

UserRegistered

↓

Email Service

↓

Analytics

↓

Notification

↓

Audit Logs

Service directly email nahi bhejega.

Wo event emit karega.

📂 auth/sockets/

Socket events

Normally auth me bahut kam use hoga.

Example

socket/

auth.socket.ts

Jaise

User Logged In

↓

Emit

User Online

Ya

Multiple Login Detected
📂 auth/tests/

Unit tests

Example

AuthService.test.ts

AuthController.test.ts

OTPService.test.ts

PasswordService.test.ts
📂 auth/index.ts

Ye export file hoti hai.

export * from "./controllers/AuthController";

export * from "./services/AuthService";

export * from "./repositories/AuthRepository";

Taaki import clean ho.

Final Structure
auth/

├── controllers/
│
├── services/
│
├── repositories/
│
├── dto/
│
├── validators/
│
├── routes/
│
├── constants/
│   ├── auth.constants.ts
│   ├── jwt.constants.ts
│   └── otp.constants.ts
│
├── enums/
│   ├── AuthProvider.ts
│   ├── OTPPurpose.ts
│   └── TokenType.ts
│
├── interfaces/
│   ├── IAuthRepository.ts
│   ├── IAuthService.ts
│   └── ITokenPayload.ts
│
├── types/
│   ├── AuthUser.ts
│   ├── JWTPayload.ts
│   └── OTPData.ts
│
├── helpers/
│   ├── generateOtp.ts
│   ├── maskPhone.ts
│   ├── maskEmail.ts
│   └── normalizePhone.ts
│
├── utils/
│   ├── jwt.util.ts
│   ├── hash.util.ts
│   ├── cookie.util.ts
│   └── otp.util.ts
│
├── events/
│   ├── user-created.event.ts
│   ├── otp-sent.event.ts
│   └── password-reset.event.ts
│
├── sockets/
│   └── auth.socket.ts
│
├── tests/
│
└── index.ts




frontend/
│
├── public/
│   ├── images/
│   ├── icons/
│   ├── logos/
│   ├── fonts/
│   ├── manifest.json
│   └── favicon.ico
│
├── src/
│
├── app/
│   │
│   ├── (public)/
│   │   ├── page.tsx                 # Landing Page
│   │   ├── about/
│   │   ├── contact/
│   │   ├── privacy/
│   │   ├── terms/
│   │   └── faq/
│   │
│   ├── (auth)/
│   │   ├── login/
│   │   ├── signup/
│   │   ├── verify-otp/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   └── google-callback/
│   │
│   ├── (provider)/
│   │   ├── dashboard/
│   │   ├── jobs/
│   │   ├── bookings/
│   │   ├── instant-booking/
│   │   ├── bidding/
│   │   ├── workers/
│   │   ├── reviews/
│   │   ├── wallet/
│   │   ├── notifications/
│   │   ├── chat/
│   │   ├── settings/
│   │   └── profile/
│   │
│   ├── (worker)/
│   │   ├── dashboard/
│   │   ├── jobs/
│   │   ├── applications/
│   │   ├── bookings/
│   │   ├── wallet/
│   │   ├── earnings/
│   │   ├── reviews/
│   │   ├── notifications/
│   │   ├── chat/
│   │   ├── settings/
│   │   └── profile/
│   │
│   ├── (agent)/
│   │
│   ├── (admin)/
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── workers/
│   │   ├── providers/
│   │   ├── agents/
│   │   ├── skills/
│   │   ├── categories/
│   │   ├── pricing/
│   │   ├── bookings/
│   │   ├── payments/
│   │   ├── analytics/
│   │   ├── reports/
│   │   ├── settings/
│   │   └── support/
│   │
│   ├── api/
│   │
│   ├── layout.tsx
│   ├── globals.css
│   ├── loading.tsx
│   ├── error.tsx
│   ├── not-found.tsx
│   └── providers.tsx
│
├── components/
│   │
│   ├── ui/
│   ├── layout/
│   ├── common/
│   ├── forms/
│   ├── cards/
│   ├── dialogs/
│   ├── tables/
│   ├── charts/
│   ├── maps/
│   ├── upload/
│   ├── loaders/
│   ├── notifications/
│   └── animations/
│
├── features/
│   │
│   ├── auth/
│   ├── jobs/
│   ├── booking/
│   ├── worker/
│   ├── provider/
│   ├── agent/
│   ├── admin/
│   ├── payment/
│   ├── wallet/
│   ├── review/
│   ├── notification/
│   ├── chat/
│   ├── settings/
│   └── analytics/
│
├── services/
│   │
│   ├── api/
│   ├── socket/
│   ├── storage/
│   ├── maps/
│   └── auth/
│
├── store/
│   │
│   ├── slices/
│   ├── api/
│   ├── middleware/
│   ├── selectors/
│   └── index.ts
│
├── hooks/
│
├── providers/
│
├── contexts/
│
├── lib/
│   │
│   ├── constants/
│   ├── enums/
│   ├── helpers/
│   ├── utils/
│   ├── validators/
│   ├── permissions/
│   ├── navigation/
│   ├── config/
│   └── themes/
│
├── types/
│
├── styles/
│
├── assets/
│
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── .env


Feature Structure

Jaise backend me module hai, waise hi frontend me feature-based architecture.

Example:

features/

auth/

├── api/
├── hooks/
├── components/
├── schemas/
├── types/
├── constants/
├── utils/
├── services/
└── index.ts

api/ → RTK Query endpoints

hooks/ → useLogin, useSignup

components/ → LoginForm, SignupForm

schemas/ → Zod validation

types/ → Auth interfaces

services/ → Auth-specific helper services

Components
components/

ui/

Sirf reusable Shadcn components.

Button

Input

Card

Dialog

Badge

Avatar

Table

Dropdown

Tabs

Toast
components/common/

Pure app me reusable.

PageHeader

SearchBar

Pagination

EmptyState

ErrorState

ConfirmDialog

ImageUploader

OTPInput

MapPicker

Currency

StatusBadge
components/layout/
Navbar

Sidebar

Footer

DashboardShell

Topbar

MobileMenu

ProfileMenu
components/forms/
LoginForm

SignupForm

JobForm

ProfileForm

SkillForm

BookingForm

PaymentForm
components/cards/
WorkerCard

JobCard

BookingCard

StatCard

ReviewCard

SkillCard
Services
services/

api/

axios.ts

baseApi.ts

Socket

socket/

socket.ts

socket-events.ts

socket-manager.ts

Google Maps

maps/

maps.service.ts

Storage

storage/

upload.service.ts
Store
store/

api/

slices/

middleware/

selectors/

Slices

authSlice

themeSlice

notificationSlice

chatSlice

bookingSlice

uiSlice
Providers
ThemeProvider

ReduxProvider

SocketProvider

AuthProvider

QueryProvider
Hooks

Global hooks

useAuth()

useSocket()

useDebounce()

usePagination()

usePermission()

useInfiniteScroll()

useCurrentLocation()

useUpload()

useDarkMode()

useNotification()
Lib
constants/

enums/

helpers/

utils/

validators/

permissions/

navigation/

config/

themes/

Difference:

constants/ → Fixed values
enums/ → TypeScript enums
helpers/ → Feature-specific helper functions
utils/ → Generic reusable utilities
validators/ → Shared Zod schemas
permissions/ → Role/permission helpers
navigation/ → Sidebar/menu configuration
config/ → Frontend configuration
themes/ → Theme tokens
---

## 5. Request Flow (per source doc, enforced by middleware stack)

```
Request → Router → AuthN (JWT) → AuthZ (RBAC) → Validation (Zod DTO)
        → Controller (thin) → Service (business logic) → Repository (Prisma)
        → Database → Repository → Service → Controller
        → Global Response Handler → Client
```

- **Controllers**: parse request, call one service method, return response. No logic.
- **Services**: all business rules, orchestrate repositories, emit events, never touch `req`/`res`.
- **Repositories**: only Prisma queries, no business logic, fully mockable for tests.

### Standard Response Envelope
```json
// success
{ "success": true, "message": "Booking created successfully.", "data": {}, "meta": {} }
// error
{ "success": false, "message": "Something went wrong.", "errorCode": "BOOKING_CONFLICT", "errors": [] }
```
All exceptions extend a base `AppException` and are caught by one `GlobalErrorHandler`; nothing leaks stack traces or Prisma errors to the client.

---

## 5a. Address Entry (Uber / Urban Company pattern)

No manual pin-drop or free-text address as the primary path. Location fields
(Job posting, Instant Request, Provider address, Worker service area) all use
a **search-and-autocomplete** input backed by Google Places Autocomplete:
type-ahead suggestions as the user types → select a suggestion → resolve to
lat/lng via Place Details/Geocoding → optionally confirm/adjust a pin on a
small embedded map. This is the only address-entry pattern in the app;
Reverse Geocoding is used to prefill "current location" as a starting
suggestion, mirroring the Uber/Urban Company home-screen search bar rather
than a traditional address form.

## 6. Pricing Engine (Strategy Pattern, backend-only)

```
FareCalculator
 ├─ BaseRateStrategy      (from Skill.baseRate)
 ├─ DistanceStrategy      (Google Maps distance matrix)
 ├─ WeatherStrategy       (external weather API multiplier, admin-configured)
 ├─ DemandStrategy        (current active-worker-to-request ratio in geo cell)
 └─ DurationStrategy
 → Sum → apply Admin PricingRule caps/floors → PlatformCommission cut
 → returns { estimatedFare } ONLY to frontend
```
Provider/Worker never receive the breakdown — only `estimatedFare` and, post-completion, the invoice. All multiplier weights live in `PlatformSetting`/`PricingRule` tables, editable from Admin panel, cached in Redis with short TTL and invalidated on admin update.

---

## 7. Instant Request Flow (Realtime, Uber-style)

No system-driven timeout. The request stays open — broadcasting to eligible
workers — until either a worker accepts or the Provider explicitly cancels it.
This keeps the flow simpler and puts control in the Provider's hands rather
than guessing a universal timeout value.

1. Provider submits skill + location + duration → `POST /instant-requests`
2. Backend computes `estimatedFare`, persists `InstantRequest(status=BROADCASTING)`
3. `EligibleWorkerStrategy` runs a **progressive radius expansion**: query Redis geo-index (`GEOSEARCH`) for online workers holding the skill within `2km` first. If zero eligible workers found, expand to `5km`. If still zero, expand to `10km`. Each expansion re-queries and re-broadcasts — it does not wait for a timeout, it escalates immediately when a radius tier comes back empty. These tier values (`2/5/10km`) live in `PlatformSetting.instantRequestRadiusTiers` (an ordered array), editable by Admin rather than hardcoded.
4. Server emits `instant_request:new` to each eligible worker's socket room at the current tier. No TTL is set — the request remains live indefinitely; if a wider tier picks up new eligible workers later, they're added to the broadcast set too (join-in-progress).
5. Frontend shows the Provider a live "searching for workers" screen (optionally reflecting the current search radius) with a persistent **Cancel** button.
6. First `instant_request:accept` event wins (atomic Redis `SETNX` lock prevents double-accept) → creates `Booking`, publishes `instant_request.accepted` event; all other workers receive `instant_request:closed`.
7. If the Provider taps **Cancel** at any point before acceptance → `POST /instant-requests/:id/cancel` → status → `CANCELLED_BY_PROVIDER`, broadcast `instant_request:closed` to all workers who received it, InstantRequest removed from the Redis geo-broadcast set.
8. Newly-coming-online workers within radius can still be added to the broadcast set for as long as the request stays `BROADCASTING` (join-in-progress), since there's no timeout cutting this off.

Note: `PlatformSetting.instantRequestTimeout` from the original settings list is dropped from MVP scope — cancellation is manual only. Keep the setting key reserved in the schema in case a max-wait safety net is added later, but it is unused for now.

---

## 8. Eventing & Async Architecture (RabbitMQ)

**Publishers** (inside services, never controllers): `booking.created`, `booking.status_changed`, `bid.submitted`, `payment.success`, `job.completed`, `review.submitted`

**Exchanges/Queues** → routed to dedicated consumer workers:
- `notification-worker`: fans out to Email/SMS/Push per user preference (Observer pattern on `NotificationDispatcher`)
- `analytics-worker`: writes to reporting tables / warehouse (future)
- `cleanup-worker`: expires stale instant requests, purges old sessions

This decouples request latency from side-effects — an API call never blocks on sending an SMS.

---

## 9. Realtime Layer (Socket.IO)

- Namespaces: `/instant-requests`, `/bidding`, `/chat`, `/notifications`
- Rooms keyed by `bookingId` (chat), `instantRequestId` (broadcast), `biddingRequestId` (bid room)
- **Redis adapter** attached to Socket.IO so it scales horizontally across multiple Node instances behind Nginx/PM2 cluster mode
- Auth: socket handshake validates JWT before joining any room

---

## 10. Security

- JWT access (short-lived, ~15 min) + refresh token (httpOnly cookie, rotated) — never store access token in localStorage from FE guidance perspective, but since FE stack uses RTK Query, keep access token in memory only
- Argon2 password hashing
- Helmet, CORS allow-list, cookie-parser, compression
- `express-rate-limit` + `rate-limit-redis` per-IP and per-user tiers (stricter on `/auth`, `/instant-requests/accept`)
- Idempotency-Key header required on payment-order-create and OTP-verify endpoints (stored in Redis, TTL 24h) to survive client retries
- RBAC middleware: role checked from JWT claims against a route's declared `@Roles()` metadata
- Webhook signature verification for Razorpay callbacks (backend is the only writer of `Payment.status`)

---

## 11. Database Schema — Core Prisma Models (abbreviated)

```prisma
model User {
  id            String   @id @default(uuid())
  role          Role     // PROVIDER | WORKER | AGENT | ADMIN
  email         String?  @unique
  phone         String?  @unique
  passwordHash  String?
  googleId      String?  @unique
  status        UserStatus @default(ACTIVE)
  createdAt     DateTime @default(now())
  provider      Provider?
  worker        Worker?
  agent         Agent?
}

model Skill {
  id          String   @id @default(uuid())
  name        String
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  baseRate    Decimal
  rateUnit    RateUnit // HOURLY | DAILY | FIXED
  status      Status   @default(ACTIVE)
}

model Booking {
  id             String   @id @default(uuid())
  type           BookingType   // NORMAL_JOB | INSTANT_REQUEST | INSTANT_BIDDING
  providerId     String
  workerId       String?
  status         BookingStatus @default(CREATED)
  estimatedFare  Decimal
  finalFare      Decimal?
  otpId          String?
  createdAt      DateTime @default(now())
  statusHistory  BookingStatusHistory[]
  payment        Payment?
  review         Review[]
  chatThread     ChatThread?
}

model BookingStatusHistory {
  id         String   @id @default(uuid())
  bookingId  String
  fromStatus BookingStatus
  toStatus   BookingStatus
  changedAt  DateTime @default(now())
  changedBy  String
}

model Otp {
  id          String   @id @default(uuid())
  purpose     OtpPurpose   // LOGIN | WORK_START
  channel     OtpChannel   // EMAIL | SMS
  identifier  String       // email or phone the code was sent to
  codeHash    String
  attempts    Int      @default(0)
  consumedAt  DateTime?
  expiresAt   DateTime
  bookingId   String?      // set only for WORK_START purpose
  createdAt   DateTime @default(now())
}

model NotificationTemplate {
  id       String   @id @default(uuid())
  type     String   // OTP_LOGIN | BOOKING_CONFIRMED | WORK_COMPLETED | ...
  channel  Channel  // EMAIL | SMS | PUSH
  locale   String   @default("en")
  subject  String?  // email only
  body     String
  updatedAt DateTime @updatedAt

  @@unique([type, channel, locale])
}

model PlatformSetting {
  key   String @id
  value Json
}
```
*(Full schema — Provider, Worker, Agent, Job, JobApplication, InstantRequest, BiddingRequest, Bid, Otp, Payment, ChatThread, Message, Review, Notification, PricingRule — expands the same pattern; build this out module-by-module in Phase 2 of implementation.)*

---

## 12. DevOps & Deployment

-next js for frontend and express for backend
- **Docker Compose** for local dev: postgres, redis, rabbitmq, api, web
- **CI (GitHub Actions)**: lint → typecheck → test → build → docker push, per-app pipelines using Turborepo's affected-graph to skip untouched apps
- **Deploy**: API on Railway/DigitalOcean/EC2 behind Nginx + PM2 cluster mode; Web on Vercel
- **Health endpoints**: `/health`, `/ready`, `/live` for orchestrator probes
- **Secrets**: Zod-validated env schema fails fast on boot if misconfigured

---

## 13. Phased Implementation Roadmap

| Phase | Scope |
|---|---|
| 0 | scaffold, Docker Compose, env schema, CI skeleton, health endpoints |
| 1 | Auth + Users + RBAC + Admin skill/category CRUD (nothing hardcoded from day one) |
| 2 | Providers, Workers, Agents profiles + onboarding |
| 3 | Jobs (Normal Job flow) end-to-end incl. applications |
| 4 | Booking aggregate + state machine + OTP + timeline |
| 5 | Pricing engine + Instant Request (Redis geo + Socket.IO broadcast) |
| 6 | Instant Bidding (bid rooms) |
| 7 | Payments (Razorpay order/verify/webhook) tied to Booking FSM |
| 8 | Chat, Notifications (email/SMS/push), Reviews |
| 9 | Admin analytics dashboards, platform settings UI |
| 10 | Hardening: rate limiting, idempotency, load testing, monitoring (Sentry/Prometheus) |

Each phase ends with a working, demoable vertical slice — never a partial cross-cutting layer.

---

## 14. Decisions Log

- **SMS provider**: Exotel, wired behind the `SmsProvider` adapter interface so it's swappable later.
- **Instant Request timeout**: none — Provider cancels manually via a persistent Cancel button (see §7).
- **Address entry**: Google Places autocomplete search, Uber/Urban-Company style (see §5a).
- **Instant Request search radius**: progressive expansion — 2km → 5km → 10km, escalating immediately when a tier has zero eligible workers, not on a timer (see §7). Tier values are admin-configurable, not hardcoded.
- **Multi-tenancy**: `city`/`state` are plain fields on records for now — no schema-level partitioning at this stage.
- **Review edit window**: 5 minutes after submission, after which the review locks.
- **Login**: identifier + OTP (channel strictly matches what the user picks — email OTP for email login, SMS OTP via Exotel for mobile login), plus Google OAuth as a separate no-OTP path. Every outbound email/SMS/push renders from an Admin-managed `NotificationTemplate`, never a hardcoded string (see §3a/§3b).

All open decisions are now resolved — this plan is ready to hand to Antigravity for Phase 0.
