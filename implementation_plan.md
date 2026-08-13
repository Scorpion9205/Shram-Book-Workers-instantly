# SHRAM — Phase-Wise Refactor Plan

> **Guiding principle**: Each phase is a complete, working state. Never break the app between phases. Backend phases come first; frontend phases follow. Every phase has a commit message you can use directly.

---

## Current State vs Target

| Area | NOW (broken) | TARGET (professional) |
|---|---|---|
| Controller | `static async` methods, raw `res.json` | Extends `BaseController`, arrow functions |
| Service | `static` methods, `prisma.*` direct, `throw new Error()` | Instance class, `IXxxService`, no Prisma |
| Repository | No layer — Prisma scattered everywhere | `BaseRepository`, `IXxxRepository`, wraps errors |
| Exceptions | `throw new Error("string")` everywhere | Typed `AppException` subclasses |
| Auth | Password-based for all roles | OTP-first for Provider/Worker, Argon2 |
| Booking FSM | `status: "CONFIRMED"` hardcoded string writes | `BookingStateService.transition()` only |
| Env | `process.env.X` inline everywhere | Zod-validated `env` object |
| Schema | `Float` for money, `password` on User, no OTP model | `Decimal`, no inline password, `Otp` model |
| Events | Socket.IO inline inside service | RabbitMQ domain events |
| Response | Inconsistent `{ success: true, message }` | `ResponseBuilder` standard envelope |

---

## Phase 0 — Foundation: Config, Exceptions, Base Classes, Response

> **Goal**: Build the skeleton everything else plugs into. Zero module work yet.

### Files to create

```
backend/src/
├── config/env.ts                           ← Zod env schema — app exits on missing vars
├── core/
│   ├── exceptions/
│   │   ├── AppException.ts                 ← abstract base
│   │   ├── ValidationException.ts
│   │   ├── AuthenticationException.ts
│   │   ├── AuthorizationException.ts
│   │   ├── NotFoundException.ts
│   │   ├── ConflictException.ts
│   │   ├── BusinessException.ts
│   │   ├── PaymentException.ts
│   │   ├── TooManyRequestsException.ts
│   │   ├── DatabaseException.ts
│   │   └── index.ts
│   ├── base/
│   │   ├── BaseController.ts               ← ok/created/paginated/noContent/validate helpers
│   │   ├── BaseService.ts                  ← Logger integration
│   │   └── BaseRepository.ts               ← buildSkip, buildPaginatedResult
│   ├── responses/
│   │   └── ResponseBuilder.ts              ← success/error/pagination envelope
│   ├── logger/
│   │   └── Logger.ts                       ← structured JSON output
│   ├── interfaces/
│   │   ├── IEventPublisher.ts
│   │   ├── ICacheService.ts
│   │   ├── IEmailProvider.ts
│   │   ├── ISmsProvider.ts
│   │   ├── IStorageProvider.ts
│   │   └── IPushProvider.ts
│   └── enums/
│       └── Role.ts
├── database/
│   └── prisma/
│       └── PrismaService.ts                ← singleton with .transaction() helper
├── middleware/
│   ├── error.middleware.ts                 ← GlobalErrorHandler (last middleware in app.ts)
│   ├── notFound.middleware.ts              ← 404 for unknown routes
│   └── validate.middleware.ts             ← validateBody / validateQuery / validateParams
└── shared/
    └── validators/
        └── common.schemas.ts              ← uuid, phone, email, pagination Zod helpers
```

### Files to modify

- `backend/src/app.ts` — mount `notFoundHandler` + `globalErrorHandler` at end
- `backend/src/server.ts` — replace `process.env.PORT` → `env.PORT`

### Commit Message

```
feat(foundation): add core base classes, typed exceptions, ResponseBuilder, Zod env

- Zod env validation — app fails fast on missing vars (config/env.ts)
- AppException hierarchy: 9 typed subclasses covering all HTTP error scenarios
- BaseController: ok/created/accepted/paginated/noContent response helpers
- BaseService with Logger (structured JSON) integration
- BaseRepository: buildSkip + buildPaginatedResult utilities
- ResponseBuilder: success/error/paginated envelope (standard SHRAM format)
- PrismaService singleton with $transaction wrapper
- GlobalErrorHandler: handles AppException, Zod, JWT errors — stack never to client
- validateBody/validateQuery/validateParams Zod middleware
- Core interfaces: IEventPublisher, ICacheService, IEmailProvider, ISmsProvider, IPushProvider
```

---

## Phase 1 — Infrastructure: CacheService + RabbitMQ + DI Bootstrap

> **Goal**: Wire Redis and RabbitMQ as injected services. Replace raw singletons.

### Files to create

```
backend/src/infrastructure/
├── cache/
│   ├── CacheService.ts                    ← implements ICacheService
│   ├── ICacheService.ts                   ← typed interface
│   └── cacheKeys.ts                       ← CacheKeys const (all key namespaces)
├── queue/
│   ├── RabbitMQEventPublisher.ts          ← implements IEventPublisher
│   ├── queue.constants.ts                 ← QueueNames, ExchangeNames, RoutingKeys
│   └── consumers/
│       └── NotificationConsumer.ts        ← handles booking.# events
└── bootstrap/
    ├── redis.bootstrap.ts                 ← createRedisClient() with retry + logging
    ├── rabbitmq.bootstrap.ts              ← assertExchanges + queues + bindings
    └── app.bootstrap.ts                   ← wireModules() full DI function
```

### Files to delete

- `backend/src/shared/services/redis/redis.service.ts` → replaced by `CacheService`
- `backend/src/shared/queue/connection/rabbitmq.connection.ts` → replaced by `rabbitmq.bootstrap.ts`

### Commit Message

```
feat(infra): CacheService, RabbitMQEventPublisher, DI bootstrap — replace raw singletons

- CacheService: typed get/set/del/setNX/incr/expire/geoAdd/geoSearch/geoRemove
- CacheKeys: centralised const map for all Redis key namespaces
- RabbitMQEventPublisher: durable topic exchange (shram.events) + persistent messages
- bootstrapRabbitMQ(): assert all exchanges, queues, DLX, and bindings on startup
- createRedisClient(): retry strategy + connect/error/reconnect event logging
- wireModules(): full manual DI function — repos → services → controllers in dependency order
- Bootstrap sequence: validate env → Prisma → Redis → RabbitMQ → providers → DI → Express → Socket
- Delete raw RedisService singleton, delete raw rabbitMQ connection singleton
```

---

## Phase 2 — Prisma Schema Migration (CRITICAL)

> **Goal**: Align schema with architecture spec. Add `Otp`, `BookingStatusHistory`, `NotificationTemplate`, `PlatformSetting`, `ChatThread`. Migrate money `Float → Decimal`. Update BookingStatus to full FSM.

> [!CAUTION]
> Run `npx prisma migrate dev --name schema_v2_architecture_alignment` BEFORE committing. Test DB connectivity after.

### Schema changes summary

```
ADD models:
  Otp                         ← purpose/channel/identifier/codeHash/attempts/consumedAt/expiresAt/bookingId
  BookingStatusHistory        ← fromStatus/toStatus/changedBy/reason/changedAt (append-only)
  NotificationTemplate        ← type+channel+locale unique; subject; body; variables JSON
  PlatformSetting             ← key (PK) / value JSON / updatedAt
  ChatThread + ChatMessage    ← per-booking chat

MODIFY models:
  User.password       → remove (Provider/Worker use OTP; Admin/Agent have separate AdminAuth model)
  User.googleId       → add String? @unique
  User.deletedAt      → add DateTime? (soft delete)
  User.refreshToken   → remove (stored in Redis via TokenService)
  Booking.amount      → Decimal (was Float)
  Booking.status      → BookingStatus enum updated to full FSM (14 states)
  Booking.address     → Json? ({ placeId, lat, lng, formattedAddress })
  Booking.type        → BookingType (NORMAL_JOB / INSTANT_REQUEST / INSTANT_BIDDING)
  Skill.baseRate      → Decimal (was Float)
  Skill.rateUnit      → RateUnit enum (HOURLY / DAILY / FIXED)

REMOVE:
  UserLocation model  ← lat/lng moves into WorkerProfile + Redis geo index
```

### BookingStatus enum (new)

```
CREATED → PAYMENT_PENDING → PAYMENT_CONFIRMED → WORKER_ASSIGNED
→ WORKER_EN_ROUTE → OTP_VERIFIED → WORK_STARTED → WORK_COMPLETED
→ PAYMENT_SETTLED → REVIEWED → CLOSED
+ CANCELLED_BY_PROVIDER | CANCELLED_BY_WORKER | EXPIRED | DISPUTED
```

### Commit Message

```
feat(schema): major Prisma migration — OTP model, BookingFSM status, Decimal money, ChatThread

BREAKING: BookingStatus enum values changed to full FSM states
BREAKING: User.password removed — OTP model handles Provider/Worker auth
BREAKING: Booking.amount Float → Decimal

- Add Otp model with Argon2-hashed code, attempts, consumedAt (prevents replay)
- Add BookingStatusHistory (append-only audit log for every FSM transition)
- Add NotificationTemplate (type+channel+locale PK; admin-managed via API)
- Add PlatformSetting (key/value JSON; runtime config for rates/radius/commission)
- Add ChatThread + ChatMessage models for per-booking communication
- Migrate Booking.amount, Skill.baseRate: Float → Decimal (money precision)
- Add Booking.type enum (NORMAL_JOB / INSTANT_REQUEST / INSTANT_BIDDING)
- Add Booking.address Json (structured location)
- Add RateUnit enum to Skill (HOURLY / DAILY / FIXED)
- Remove UserLocation — worker lat/lng in WorkerProfile + Redis GEOADD
- Migration: 0002_schema_v2_architecture_alignment
- Update seed: default PlatformSettings + sample NotificationTemplates
```

---

## Phase 3 — Auth Module: OTP-First

> **Goal**: Replace static-method, password-based `AuthService` with proper OOP OTP-first auth.

### Files to create

```
backend/src/modules/auth/
├── controllers/AuthController.ts          ← extends BaseController, arrow functions
├── services/
│   ├── AuthService.ts                     ← implements IAuthService
│   ├── OTPService.ts                      ← Argon2id hash, rate-limit via CacheService
│   └── TokenService.ts                    ← JWT + Redis refresh token storage
├── repositories/
│   ├── AuthRepository.ts                  ← User CRUD (extends BaseRepository)
│   └── OTPRepository.ts                   ← create/findActive/consume/invalidate
├── interfaces/
│   ├── IAuthService.ts
│   ├── IOTPService.ts
│   ├── ITokenService.ts
│   ├── IAuthRepository.ts
│   └── IOTPRepository.ts
├── dto/
│   ├── RequestOTP.dto.ts
│   ├── VerifyOTP.dto.ts
│   ├── AdminLogin.dto.ts                  ← email + password (Argon2id verify)
│   └── GoogleAuth.dto.ts                  ← idToken
├── middleware/
│   ├── authenticate.middleware.ts         ← JWT verify → req.user
│   └── role.middleware.ts                 ← authorize(...roles)
├── constants/otp.constants.ts
├── enums/
│   ├── OTPPurpose.ts                      ← LOGIN / WORK_START / RESET_PASSWORD
│   └── OTPChannel.ts                      ← EMAIL / SMS
├── routes/auth.routes.ts
└── index.ts
```

### New endpoints

```
POST /api/v1/auth/otp/request          ← send OTP (Provider/Worker)
POST /api/v1/auth/otp/verify           ← verify → JWT + refresh cookie
POST /api/v1/auth/otp/resend
POST /api/v1/auth/token/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/google               ← Google ID token → JWT
POST /api/v1/auth/admin/login          ← Argon2id password (Admin/Agent only)
```

### Files to delete

- `backend/src/modules/auth/services/auth.service.ts`
- `backend/src/modules/auth/controllers/auth.controller.ts`
- `backend/src/shared/middleware/auth.middleware.ts`

### Commit Message

```
feat(auth): OTP-first auth — OTPService (Argon2id), TokenService (JWT+Redis), RBAC middleware

BREAKING: /auth/login removed — use /auth/otp/request + /auth/otp/verify
BREAKING: Password login removed for Provider/Worker

- OTPService: rate-limited (5/hr, 1/30s), Argon2id hash, 5-min expiry, replay prevention
- OTPRepository: create, findActive (not consumed, not expired), incrementAttempts, markConsumed
- TokenService: JWT access (15m) + refresh (7d) stored in Redis; auto-revoke on logout
- AuthRepository: findByIdentifier (phone or email), create new User in tx
- AuthController: extends BaseController, all methods are arrow functions
- authenticate middleware: reads Bearer token → TokenService.verifyAccessToken → req.user
- authorize(...roles) middleware: checks req.user.role against allowed roles list
- Admin/Agent login: Argon2id verify against stored hash
- Google OAuth: verify Google ID token → upsert User by googleId/email → issue JWT
- Wire all to DI container in app.bootstrap.ts
- Delete: old auth.service.ts (static methods), old auth.middleware.ts
```

---

## Phase 4 — Booking Module: Repository + FSM

> **Goal**: BookingStateService controls ALL status transitions. Every transition is atomic, logged, and emits a domain event.

### Files to create

```
backend/src/modules/bookings/
├── controllers/BookingController.ts
├── services/
│   ├── BookingService.ts                  ← list, getById, create, cancel (delegates FSM)
│   └── BookingStateService.ts             ← ONLY class that writes booking.status
├── repositories/
│   ├── BookingRepository.ts               ← extends BaseRepository<Booking>
│   └── BookingStatusHistoryRepository.ts  ← append-only FSM log
├── interfaces/
│   ├── IBookingService.ts
│   ├── IBookingStateService.ts
│   ├── IBookingRepository.ts
│   └── IBookingHistoryRepository.ts
├── dto/
│   ├── FilterBookings.dto.ts
│   ├── CancelBooking.dto.ts
│   └── CreateBooking.dto.ts
├── mappers/Booking.mapper.ts              ← Prisma model → BookingResponseDto
├── constants/
│   └── booking-transitions.constants.ts  ← VALID_TRANSITIONS: Record<Status, Status[]>
├── enums/
│   ├── BookingStatus.ts
│   ├── BookingType.ts
│   └── CancelReason.ts
├── events/booking.events.ts               ← BookingEvents + payload types
├── policies/BookingPolicy.ts              ← canView, canCancel, canReview
├── routes/booking.routes.ts
└── index.ts
```

### Files to delete

- `backend/src/modules/booking/services/booking.service.ts` (static methods, inline Prisma)

### Commit Message

```
feat(booking): BookingStateService FSM, BookingRepository, BookingPolicy, domain events

- BookingStateService: validateTransition → atomic tx (updateStatus + appendHistory) → emit event
- VALID_TRANSITIONS map: 14 states, all terminal states explicitly empty []
- BookingStatusHistoryRepository: append-only log, never delete
- BookingRepository extends BaseRepository: findById (with relations), findManyByFilter, updateStatus, softDelete
- BookingPolicy: canView (own or admin), canCancel (role + status check), canReview (completed only)
- BookingController: extends BaseController — all arrow functions, delegate to service
- BookingMapper: Prisma Booking + relations → BookingResponseDto (Decimal→number, ISO dates)
- Every transition emits booking.status_changed to RabbitMQ (async, fire-and-forget)
- Remove old booking.service.ts — no more static Prisma calls
```

---

## Phase 5 — Pricing Engine + PlatformSetting

> **Goal**: `FareCalculator` with Strategy pattern. All rates from DB. Provider gets only `estimatedFare`.

### Files to create

```
backend/src/modules/pricing/
├── services/FareCalculator.ts             ← orchestrates strategies
├── strategies/
│   ├── BaseRateStrategy.ts                ← Skill.baseRate × RateUnit
│   ├── DistanceStrategy.ts                ← Google Maps km × distanceRatePerKm
│   ├── DemandStrategy.ts                  ← Redis geo ratio → surge flat fee
│   ├── WeatherStrategy.ts                 ← admin multiplier from PlatformSetting
│   └── DurationStrategy.ts
├── interfaces/
│   ├── IPricingStrategy.ts
│   └── IFareCalculator.ts
├── dto/PricingEstimate.dto.ts
├── routes/pricing.routes.ts
└── index.ts

backend/src/modules/platform-settings/
├── repositories/PlatformSettingRepository.ts   ← Redis-cached (60s TTL)
├── services/PlatformSettingService.ts           ← get/set + cache invalidation
├── interfaces/IPlatformSettingRepository.ts
├── routes/platform-setting.routes.ts
└── index.ts
```

### Commit Message

```
feat(pricing): FareCalculator (Strategy pattern) + PlatformSetting repository with Redis cache

- IPricingStrategy interface + 5 strategy implementations (all read from DB/Redis)
- FareCalculator: run all strategies in Promise.all, apply DB price caps/floors, deduct commission
- PlatformSettingRepository: read-through Redis cache (60s TTL), invalidated on admin write
- All fare values: Decimal precision, converted to number only in response
- GET /api/v1/pricing/estimate: returns only { estimatedFare } — no breakdown to frontend
- Pricing rules (min/max fare per skill) from PlatformSetting
- Commission percent from PlatformSetting (default: 15%)
- No hardcoded rates anywhere — Zod validates all values from DB before use
```

---

## Phase 6 — Instant Request + Socket.IO Server

> **Goal**: Progressive radius expansion, SETNX atomic accept, real-time broadcast via namespaced Socket.IO with Redis adapter.

### Files to create

```
backend/src/modules/instant-requests/
├── controllers/InstantRequestController.ts
├── services/InstantRequestService.ts       ← create, accept, cancel, broadcast
├── repositories/InstantRequestRepository.ts
├── strategies/EligibleWorkerStrategy.ts    ← progressive radius 2→5→10km
├── interfaces/
│   ├── IInstantRequestService.ts
│   └── IInstantRequestRepository.ts
├── dto/
│   ├── CreateInstantRequest.dto.ts
│   └── AcceptInstantRequest.dto.ts
├── enums/InstantRequestStatus.ts
├── events/instant-request.events.ts
├── routes/instant-request.routes.ts
└── index.ts

backend/src/socket/
├── SocketServer.ts                         ← init + Redis adapter + namespace mount
├── SocketGateway.ts                        ← ISocketGateway: emitToUser/emitToRoom/emitToAll
├── socket.middleware.ts                    ← JWT auth handshake
├── socket.rooms.ts                         ← SocketRooms const
├── socket.events.ts                        ← SocketEvents const (no magic strings)
└── handlers/
    ├── InstantRequestNamespace.ts
    ├── ChatNamespace.ts
    ├── BiddingNamespace.ts
    └── NotificationNamespace.ts
```

### Files to delete

- `backend/src/socket/socket.ts` → replaced by `SocketServer.ts` + `SocketGateway.ts`

### Commit Message

```
feat(instant-requests): progressive radius geo, SETNX atomic accept, Socket.IO namespaces + Redis adapter

- EligibleWorkerStrategy: Redis GEORADIUS 2→5→10km (tiers from PlatformSetting), skill filter
- SETNX atomic lock (30s TTL) prevents race condition on simultaneous accept
- SocketServer: 4 namespaces (/instant-requests, /bidding, /chat, /notifications)
- Redis adapter (@socket.io/redis-adapter) for horizontal scaling
- JWT auth handshake middleware on all namespaces
- SocketGateway injected into services — never import raw io instance in domain code
- SocketRooms + SocketEvents constants — no magic strings
- Worker go_online: emit → GEOADD + status key (5m TTL)
- Worker disconnect: GEODREM + del status key (auto-offline)
- Broadcast instant_request:new to eligible workers in parallel
- Broadcast instant_request:closed on accept/cancel to entire room
- Remove old raw socket.ts singleton
```

---

## Phase 7 — Remaining Domain Modules

> **Goal**: Refactor users, workers, jobs, reviews, payments, wallet, agents, admin to OOP pattern.

### Modules + key changes

| Module | Key new artifacts |
|---|---|
| `users/` | UserRepository, UserService (profile CRUD, deactivate), UserMapper |
| `workers/` | WorkerRepository, WorkerProfileService, WorkerSkillService, WorkerLocationService |
| `jobs/` | JobRepository, JobService, ApplicationRepository, ApplicationService |
| `reviews/` | ReviewRepository, ReviewService (submit + update worker avg rating in tx) |
| `payments/` | PaymentRepository, RazorpayProvider (IPaymentProvider), PaymentService |
| `wallet/` | WalletRepository, WalletService (credit on event), TransactionRepository |
| `agents/` | AgentRepository, AgentService, AgentWorkerRepository |
| `admin/` | AdminUserService, AdminBookingService, AdminAnalyticsService |

### Commit Message

```
feat(modules): refactor users, workers, jobs, payments, wallet, agents — full OOP pattern

- All services implement IXxxService interface (no naked static functions)
- All repositories extend BaseRepository<T> and implement IXxxRepository
- All Prisma access isolated to Repository classes — zero prisma.* in services
- All throw uses typed AppException subclasses — zero throw new Error("string")
- PaymentService: createRazorpayOrder + verifyWebhook signature + transition PAYMENT_CONFIRMED
- RazorpayProvider implements IPaymentProvider — swappable payment gateway
- WalletService: credit worker wallet on booking.payment_settled event
- ReviewService: submit → update WorkerProfile.rating (running avg) in one tx
- WorkerLocationService: setOnline/setOffline/updateLocation (Redis GEOADD/ZREM)
- Wire all to DI container via app.bootstrap.ts
```

---

## Phase 8 — Notification System + All Consumers

> **Goal**: NotificationDispatcher with DB template resolution, multi-channel dispatch. All RabbitMQ consumers wired.

### Files to create

```
backend/src/
├── modules/notifications/
│   ├── services/NotificationDispatcher.ts        ← template resolve + fan out
│   ├── repositories/
│   │   ├── NotificationTemplateRepository.ts     ← Redis-cached (5min)
│   │   └── NotificationLogRepository.ts          ← per-dispatch log
│   ├── enums/
│   │   ├── NotificationType.ts
│   │   └── NotificationChannel.ts
│   └── index.ts
├── infrastructure/
│   ├── providers/
│   │   ├── email/ResendProvider.ts               ← implements IEmailProvider
│   │   ├── sms/ExotelProvider.ts                 ← implements ISmsProvider
│   │   ├── push/FirebaseProvider.ts              ← implements IPushProvider
│   │   └── storage/S3Provider.ts                 ← implements IStorageProvider
│   └── queue/consumers/
│       ├── NotificationConsumer.ts               ← booking.# + payment.# + user.registered
│       ├── WalletConsumer.ts                     ← booking.payment_settled → credit wallet
│       └── CleanupConsumer.ts                    ← expired instant requests
```

### Commit Message

```
feat(notifications): NotificationDispatcher, multi-channel providers, all RabbitMQ consumers

- NotificationDispatcher: resolves template from DB (Redis 5min cache), interpolates {{vars}}
- Fan-out: EMAIL (Resend) + SMS (Exotel) + PUSH (Firebase) with Promise.allSettled error isolation
- NotificationConsumer: handles all booking.status_changed → maps to NotificationType + dispatches
- WalletConsumer: credits worker wallet on booking.payment_settled event
- CleanupConsumer: processes expired instant requests (BROADCASTING → EXPIRED)
- ResendProvider / ExotelProvider / FirebaseProvider all implement typed provider interfaces
- S3Provider: presigned URL generation, multipart upload for profile images
- Admin: CRUD /admin/notification-templates → invalidates Redis cache on update
- Template syntax: {{variableName}} interpolation (no eval, no template literals)
```

---

## Phase 9 — Work-Start OTP + Booking Completion Flow

> **Goal**: Implement work-start flow end-to-end: Worker marks en-route → OTP to Provider → Worker enters code → work starts.

### New endpoints

```
PATCH /api/v1/bookings/:id/worker-en-route      ← Worker → OTP sent to Provider phone
POST  /api/v1/bookings/:id/verify-start-otp     ← Worker submits OTP → WORK_STARTED
PATCH /api/v1/bookings/:id/complete             ← Worker → WORK_COMPLETED
POST  /api/v1/bookings/:id/review               ← Provider submits review
```

### Commit Message

```
feat(booking-flow): work-start OTP (SMS to Provider), FSM completion, payment settlement trigger

- Worker en-route: bookingStateService.transition(WORKER_EN_ROUTE) → OTPService.request(WORK_START, provider.phone)
- Work-start OTP: separate Otp record (purpose=WORK_START, bookingId linked) — not same as auth OTP
- Verify OTP: atomic — markConsumed → transition(OTP_VERIFIED) → transition(WORK_STARTED) in one tx
- Complete: transition(WORK_COMPLETED) → emit booking.completed → consumer handles PAYMENT_SETTLED
- Review: provider submits → ReviewService updates WorkerProfile.rating (running avg in tx)
- Full happy path: CREATED→PAYMENT_CONFIRMED→WORKER_ASSIGNED→WORKER_EN_ROUTE→OTP_VERIFIED→WORK_STARTED→WORK_COMPLETED→PAYMENT_SETTLED→REVIEWED→CLOSED
- Socket events: emit booking:status_changed to provider+worker rooms on every transition
```

---

## Phase 10 — RBAC, Admin Module, PlatformSetting CRUD

> **Goal**: Every route is role-guarded. Admin has full platform control.

### Admin endpoints

```
GET  /admin/users                          ← list (paginated + filter by role/status)
PUT  /admin/users/:id/suspend
GET  /admin/bookings                       ← all bookings with filters
POST /admin/bookings/:id/assign-worker     ← manual worker assignment → WORKER_ASSIGNED
GET  /admin/settings                       ← all PlatformSettings
PUT  /admin/settings/:key                  ← update + invalidate Redis cache
GET  /admin/notification-templates
PUT  /admin/notification-templates/:type/:channel/:locale
GET  /admin/analytics/dashboard            ← daily bookings, revenue, active workers
PUT  /admin/workers/:id/verify
```

### Commit Message

```
feat(admin+rbac): Admin module, RBAC on all routes, PlatformSetting CRUD with cache invalidation

- authorize() guards all routes — every endpoint specifies required role(s)
- Admin: user management, booking oversight, manual worker assignment
- PlatformSetting update: Redis cache invalidation on write (platform:setting:*)
- Admin manual assign: bookingStateService.transition(WORKER_ASSIGNED, { changedBy: adminId })
- AdminAnalyticsService: aggregate stats (daily bookings, revenue, fill rate, avg rating)
- Worker verification: admin approves worker profile → Worker can go online
- All /admin/* routes: authenticate + authorize(ADMIN)
- Agent routes: authorize(AGENT, ADMIN)
- BookingPolicy enforced in all booking service methods
```

---

## Phase 11 — Frontend: Store, BaseApi, Feature Modules

> **Goal**: Feature-based architecture, RTK Query, Redux store, SocketProvider, remove all bare `fetch()` calls.

### Files to create / refactor

```
frontend/src/
├── store/
│   ├── index.ts                           ← configureStore (all slices + RTK middleware)
│   ├── api/baseApi.ts                     ← createApi + auto-refresh on 401 interceptor
│   └── slices/
│       ├── authSlice.ts                   ← accessToken, user, isAuthenticated
│       ├── uiSlice.ts                     ← toast, modal
│       ├── chatSlice.ts                   ← messages by bookingId
│       └── notificationSlice.ts           ← unread count + list
├── providers/
│   ├── Providers.tsx                      ← ReduxProvider + ThemeProvider + SocketProvider
│   └── SocketProvider.tsx                 ← notifications namespace on login
├── lib/types/api.types.ts                 ← ApiResponse<T>, PaginatedResponse<T>, ApiError
├── hooks/
│   ├── useAppDispatch.ts
│   ├── useAppSelector.ts
│   └── useToast.ts
└── features/
    ├── auth/                              ← OTP flow, Google OAuth, token refresh
    ├── booking/                           ← list, detail, create, cancel, review
    ├── worker/                            ← profile, skills, availability
    ├── provider/                          ← profile, job posting
    ├── instant-request/                   ← create IR, worker accept
    ├── payment/                           ← Razorpay checkout
    ├── notifications/                     ← list, mark-read, badge
    └── chat/                              ← thread, send, socket listener
```

### Commit Message

```
feat(frontend): feature-based architecture, RTK Query baseApi, Redux store, SocketProvider

- configureStore: RTK Query reducer + middleware + auth/ui/chat/notification slices
- baseApi: single createApi; all features use injectEndpoints (shared cache)
- Auto-refresh: 401 → POST /auth/token/refresh → retry original request → logout on fail
- authSlice: OTP request/verify/resend, Google OAuth, accessToken, logout
- SocketProvider: connects /notifications on login; dispatches addNotification to slice
- All features: api (RTK Query) + hooks + components + schemas (Zod) + types + index.ts barrel
- Remove all bare fetch() calls — everything through RTK Query
- Auth feature: OTP flow with 30s resend countdown, form validation (Zod + RHF)
- Booking feature: filter list, detail, cancel with confirmation, review submission
```

---

## Phase 12 — Frontend: Worker Real-Time + Instant Request UI

> **Goal**: Worker goes online, shares location, sees instant request popup, accepts in real-time.

### Key files

```
features/worker/
├── hooks/
│   ├── useWorkerLocation.ts               ← geolocation watchPosition → socket location_update
│   └── useInstantRequestSocket.ts         ← IR:new modal with 30s countdown → accept/decline
└── components/
    ├── GoOnlineButton.tsx
    └── InstantRequestModal.tsx             ← animated popup, estimatedFare, timer
```

### Commit Message

```
feat(frontend-worker): go-online flow, real-time location tracking, instant request accept modal

- useWorkerLocation: browser watchPosition → emit worker:location_update on move
- useInstantRequestSocket: listen instant_request:new → show modal with 30s countdown
- Auto-dismiss modal on instant_request:closed (another worker accepted)
- Accept: POST /instant-requests/:id/accept → RTK mutation → redirect to booking detail
- GoOnlineButton: geolocation permission request → emit worker:go_online → Redux state
- Worker offline: emit worker:go_offline on button + beforeunload event
- InstantRequestModal: slide-in animation, fare display, countdown ring, accept/decline CTA
```

---

## Phase 13 — Frontend: Address Autocomplete + Provider Flows

> **Goal**: Uber-style address input everywhere. Provider job creation + instant request creation flows.

### Commit Message

```
feat(frontend-provider): Google Places autocomplete, create job, create instant request

- AddressSearch component: Google Places Autocomplete (India, geocode+establishment)
- "Use current location" button → browser geolocation → reverse geocoding → fill input
- useGoogleMapsScript hook: lazy-loads Maps JS API once per session
- Address always stored as { placeId, lat, lng, formattedAddress } — never plain string
- Provider: create job form (AddressSearch + skill picker + budget + requiredWorkers)
- Provider: create instant request form + GET /pricing/estimate preview (debounced)
- Provider dashboard: booking list → status filter chips → booking detail with timeline
- Job application list: accept/reject applicants → creates booking
```

---

## Phase 14 — Testing, Security Hardening, Production Polish

> **Goal**: Unit + integration tests. Rate limiting, Helmet, idempotency. Zero `console.log`. Zero TypeScript errors.

### Files to create

```
backend/src/
├── middleware/
│   ├── rateLimit.middleware.ts             ← express-rate-limit + Redis store
│   ├── idempotency.middleware.ts           ← payment create + OTP verify
│   ├── requestId.middleware.ts             ← X-Request-ID header
│   └── helmet.middleware.ts               ← security headers
└── modules/*/tests/
    ├── factories/XxxFactory.ts            ← type-safe test data builders
    └── *.service.test.ts                  ← vitest unit tests

tests/integration/
├── auth.integration.test.ts
└── booking.integration.test.ts
```

### Commit Message

```
test(all): unit tests (vitest), integration tests (supertest), security hardening

- Unit tests: OTPService.verify, BookingStateService.transition, FareCalculator.calculate, TokenService
- Test factories: BookingFactory, UserFactory, OtpFactory (type-safe Partial<T> overrides)
- Integration tests: POST /auth/otp/request (rate limit), POST /auth/otp/verify, POST /bookings
- Rate limiting: 5 OTP requests/hr, 100 API calls/15min (Redis store)
- Helmet: security headers (CSP, HSTS, X-Frame-Options)
- Idempotency middleware: payment order + OTP verify endpoints (24hr Redis TTL)
- X-Request-ID middleware: traceable request IDs in all logs
- /health + /ready endpoints: DB ping + Redis ping
- CORS: restricted to env.FRONTEND_URL only
- All console.log → Logger.info/error (structured JSON)
- Zero TypeScript errors (strict mode), zero ESLint warnings
```

---

## Phase Summary

| # | Phase | Backend | Frontend | Commit Prefix |
|---|---|---|---|---|
| 0 | Foundation: exceptions, base classes, env | ✅ | — | `feat(foundation):` |
| 1 | Infra: CacheService, RabbitMQ, DI bootstrap | ✅ | — | `feat(infra):` |
| 2 | Prisma schema migration | ✅ | — | `feat(schema):` |
| 3 | Auth module: OTP-first | ✅ | — | `feat(auth):` |
| 4 | Booking: repository + FSM | ✅ | — | `feat(booking):` |
| 5 | Pricing engine + PlatformSetting | ✅ | — | `feat(pricing):` |
| 6 | Instant request + Socket.IO server | ✅ | — | `feat(instant-requests):` |
| 7 | Users, workers, jobs, payments, wallet | ✅ | — | `feat(modules):` |
| 8 | Notifications + consumers | ✅ | — | `feat(notifications):` |
| 9 | Work-start OTP + completion flow | ✅ | — | `feat(booking-flow):` |
| 10 | RBAC + Admin module | ✅ | — | `feat(admin+rbac):` |
| 11 | Frontend: store + feature modules | — | ✅ | `feat(frontend):` |
| 12 | Frontend: worker real-time | — | ✅ | `feat(frontend-worker):` |
| 13 | Frontend: provider + address | — | ✅ | `feat(frontend-provider):` |
| 14 | Tests + security hardening | ✅ | ✅ | `test(all):` |

> [!IMPORTANT]
> **Phases 0 → 1 → 2 must be done in strict order.** Everything depends on them.
> Phases 3–10 are sequential (each depends on the previous).
> Phases 11–13 can start after Phase 3 (frontend needs auth tokens).
> Phase 14 runs after Phase 10.

> [!TIP]
> Say **"start Phase 0"** and I will implement every file listed above completely before stopping.
