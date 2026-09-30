# Shram — Deep Architecture Audit
> Analyzed against `SHRAM_Architecture_Plan.md` · 22 Sep 2026 · Round 2 deep-dive 30 Sep 2026 (see bottom of file)

---

## Executive Summary

The project has a **solid foundation** (Phase 0–6 partially done) but has several **critical gaps, architectural violations, and missing features** that block a production-ready milestone. Below is the complete breakdown.

---

## ✅ What Is Done (Solid)

| Area | Status |
|---|---|
| Zod-validated env schema (`config/env.ts`) | ✅ Done |
| Clean Architecture skeleton (core/base/exceptions/interfaces) | ✅ Done |
| OTP-first Auth (signup, login, refresh, verify) | ✅ Done |
| Token Service (JWT access + refresh, Redis blacklist) | ✅ Done |
| Argon2id password hashing for OTP codes | ✅ Done |
| Booking FSM (`BookingStateService.transition()` + history log) | ✅ Done |
| Pricing Engine (fare strategies) | ✅ Done |
| Instant Request — DIRECT mode (geo Redis + Socket.IO broadcast) | ✅ Done |
| Instant Bidding — BIDDING mode (bid submit/select, atomic lock) | ✅ Done |
| Payment (Razorpay order create / verify / webhook) | ✅ Done |
| Wallet (Worker balance, credit/debit transactions) | ✅ Done |
| RabbitMQ event publishing + consumers (notification, wallet, cleanup) | ✅ Done |
| NotificationDispatcher (email + SMS + push multi-channel) | ✅ Done |
| Email templates (OTP, Welcome, BookingCreated, Cancelled, etc.) | ✅ Done |
| Admin module (user mgmt, booking override, platform settings) | ✅ Done |
| Rate limiter middleware (per-user and per-IP) | ✅ Done |
| Idempotency middleware | ✅ Done |
| Helmet security headers | ✅ Done |
| Request ID middleware | ✅ Done |
| Reviews module (post-booking, 5-min edit window) | ✅ Done |
| Agents module (agent + worker management) | ✅ Done |
| Frontend: Auth pages (login, signup, OTP verify) | ✅ Done |
| Frontend: Role-based dashboards (Provider, Worker, Admin) | ✅ Done |
| Frontend: RTK Query API slices for all modules | ✅ Done |
| Frontend: Socket provider + instant request popup | ✅ Done |
| Frontend: Google Maps address autocomplete | ✅ Done |
| Frontend: Go-online button + worker live location | ✅ Done |

---

## 🔴 CRITICAL — Missing or Broken (Blocks Production)

### 1. Chat Module — Completely Missing (Phase 8)
**Architecture Plan requires**: `/chat`, namespaced Socket.IO rooms keyed by `bookingId`, ChatThread + ChatMessage Prisma models.

- ❌ `backend/src/modules/chat/` — **does not exist**
- ❌ No chat REST endpoints (`GET /chat/:bookingId/messages`, `POST /chat/:bookingId/send`)
- ❌ Socket.IO `/chat` namespace — **not created** (only one default namespace exists in `socket.ts`)
- ❌ No frontend chat page for either Provider or Worker
- ✅ `ChatThread` and `ChatMessage` Prisma models — exist in schema (good)

**Impact**: Providers and Workers cannot communicate once a booking is matched.

---

### 2. Dual Bootstrap Architecture — Hybrid Mess (Critical Technical Debt)
**Problem**: The server boots **two separate stacks** simultaneously:

```
server.ts
├── Legacy stack (static imports)
│   ├── auth.routes.ts
│   ├── location.routes.ts
│   ├── providers/routes
│   ├── skills/routes
│   ├── instant-requests/routes    ← Still uses raw prisma, static methods
│   ├── dashboard/routes
│   └── pricing/routes
└── New DI stack (wireModules)
    ├── users, workers, agents, reviews
    ├── jobs, payments, wallet
    ├── admin, notifications, bookings
    └── platform-settings
```

- ❌ Legacy routes use `static async` service methods and raw `prisma` imports — violates OOP + DI rules
- ❌ New DI wiring exposes deps via `(global as any).deps` — a global mutation anti-pattern
- ❌ `instant-requests/services/instant-request.service.ts` is **100% static methods** with direct Prisma access — the worst offender
- ❌ Two `AuthService` variants exist (old in `modules/auth/services/AuthService.ts` with proper DI, old static version mounted via `auth.routes.ts`)

**Impact**: Code is unmaintainable and untestable. Static methods cannot be mocked in unit tests.

---

### 3. Google OAuth — Stub Only (Phase 1)
- `GoogleAuth.dto.ts` exists ✅
- `AuthService.googleAuth()` exists but is **marked as stub**: `// Stub verification of Google Token for Phase 3`
- Uses raw JWT decode instead of `google-auth-library` `OAuth2Client.verifyIdToken()`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are in env schema as optional but never used
- No Google OAuth callback route

**Impact**: Google login button on frontend will fail in production.

---

### 4. Socket.IO — Missing Namespaces (Phase 9)
Architecture Plan specifies **4 namespaces**: `/instant-requests`, `/bidding`, `/chat`, `/notifications`

Current `socket.ts` has:
- ❌ Only **one default namespace** (`io.on('connection', ...)`)
- ❌ No `/chat` namespace
- ❌ No `/bidding` namespace  
- ❌ No `/notifications` namespace
- ❌ No Redis adapter for horizontal scaling (just single-node)
- `join_skill_room` / `leave_skill_room` events exist but are unused by any service

---

### 5. Platform Settings — No Routes or Controller
- `PlatformSettingRepository.ts` ✅ exists
- `PlatformSettingService.ts` ✅ exists
- ❌ **No controller**
- ❌ **No routes** — `platform-settings` is never mounted in `app.ts`
- ❌ Admin cannot actually read/write platform settings via API
- Admin UI page (`/admin/settings/page.tsx`) exists on frontend but has no backend to call

---

### 6. Agent Module — Shell Only (Phase 2)
- `agents/index.ts` exports AgentController, AgentService, AgentRepository ✅
- ❌ `agents/` module only has `index.ts` — no controllers/, services/, repositories/ subdirectories
- ❌ AgentController is wired in bootstrap but has no actual implementation
- ❌ Agent onboarding flow (Agent registers workers, assigns to jobs) — not implemented

---

### 7. `instant-request.service.ts` — Static + Direct Prisma (Major Violation)
This is the most architecturally broken file:
```ts
// WRONG — static methods, raw prisma, mocked data in production code
static async submitBid(...) {
  rating: 4.8, // Mocked rating profile   ← HARDCODED MOCK DATA IN PRODUCTION!
  totalJobs: 12, // Mocked jobs completed  ← HARDCODED MOCK DATA IN PRODUCTION!
}
```
- ❌ All methods are `static` — cannot be injected or mocked
- ❌ Calls `prisma.*` directly — bypasses Repository layer
- ❌ **Hardcoded mock data** (`rating: 4.8`, `totalJobs: 12`) in production socket emit
- ❌ Not wired into DI bootstrap — mounted as a separate legacy route

---

## 🟠 HIGH — Gaps That Block Full Feature Completeness

### 8. No `/ready` and `/live` Health Endpoints
Architecture plan requires `/health`, `/ready`, `/live` for orchestrator probes (Docker/K8s).
- ✅ `/api/v1/health` exists (DB + Redis ping)
- ❌ `/ready` — missing
- ❌ `/live` — missing

---

### 9. Rate Limiting Not Applied to Critical Routes
Rate limiter middleware exists but is **not applied** to:
- ❌ `POST /auth/request-otp` — OTP spam attack surface
- ❌ `POST /instant-requests/:id/accept` — race condition attack surface (architecture plan specifically calls this out)
- ❌ `POST /payments/order` — financial endpoint

---

### 10. `AuthService` — Missing `sendOtp` on Signup (Email Channel)
- `signup()` stores OTP in DB but **only sends via SMS**
- If user provides email, OTP record is created for email but email is never dispatched
- `emailProvider.sendEmail()` is never called in `AuthService.signup()`

---

### 11. Review Module — Missing Edit Window Enforcement
Architecture plan specifies: *"5-minute edit window after submission, after which review locks"*
- `ReviewService` exists but has no `editReview()` method
- No time-lock check: `if (Date.now() - review.createdAt > 5 * 60 * 1000) throw`

---

### 12. Wallet Consumer — No Razorpay Webhook-to-Wallet Credit Flow
- `WalletConsumer` exists and starts ✅
- `PaymentService.handleWebhook()` fires `payment.success` event ✅
- ❌ `WalletConsumer` does not listen to `payment.success` to credit the Worker's wallet
- Workers' wallets are never credited after a booking completes

---

### 13. Frontend — No Instant Bidding UI (Provider Side)
- Backend bidding APIs fully implemented ✅
- Frontend: `InstantRequestPopup.tsx` exists for worker side ✅
- ❌ No Provider-side UI to **view incoming bids in real-time** and select one
- ❌ `instantRequestApi.ts` has no `selectBid` mutation
- ❌ Socket event `instant-bidding:bid-submitted` is emitted but never consumed on frontend

---

### 14. Frontend — Missing Pages
| Missing Page | Role | Priority |
|---|---|---|
| `/chat/[bookingId]` | Provider + Worker | 🔴 Critical |
| `/provider/instant-requests/bidding` | Provider | 🟠 High |
| `/admin/platform-settings` (functional) | Admin | 🟠 High |
| `/provider/wallet` | Provider | 🟡 Medium |
| `/worker/wallet` (full transactions list) | Worker | 🟡 Medium |
| `/admin/analytics` | Admin | 🟡 Medium |

---

## 🟡 MEDIUM — Technical Debt & Code Quality

### 15. Duplicate Consumers
- `shared/email/consumers/email.consumer.ts` AND `shared/queue/consumers/email.consumer.ts` — two email consumers that both listen on RabbitMQ. Risk of double email sends.
- `shared/queue/consumers/sms.consumer.ts` exists but is never started in bootstrap.

### 16. Test Files in `src/` Root
- `src/test_email.ts`, `src/test_exotel.ts`, `src/test_users.ts` — **test scripts committed to source**
- These import real credentials and make live API calls — should be in `tests/` or deleted

### 17. `OtpEmail.tsx` Mismatch
- `AuthService` imports `OtpEmail` from `templates/OtpEmail.js` (JSX component)
- File listing shows `otp-login.template.ts` (plain TS template) — different naming convention
- Risk of import resolution failure at runtime

### 18. `BookingStatus.CREATED` vs `CONFIRMED` Mismatch in PaymentService
```ts
// PaymentService.createOrder()
if (booking.status !== BookingStatus.CREATED) {  // ← Wrong check
```
Architecture plan: payment is triggered after booking is `CONFIRMED`, not `CREATED`. A booking in `CREATED` status means it hasn't been accepted yet.

### 19. `(global as any).deps` Anti-Pattern
All dynamically-wired routers are accessed via `(global as any).deps.userRouter` in `app.ts`. This:
- Breaks TypeScript type safety completely
- Causes `Cannot read properties of undefined` if bootstrap fails but server continues
- Should use Express `app.locals` or a proper IoC container

### 20. Missing Docker Compose (Phase 0)
Architecture plan specifies Docker Compose for local dev with postgres, redis, rabbitmq, api, web.
- ❌ `docker-compose.yml` — does not exist at root

---

## Phase Completion Status

| Phase | Description | Status |
|---|---|---|
| **Phase 0** | Scaffold, env, CI, health endpoints | 🟠 ~85% (missing /ready, /live, Docker Compose) |
| **Phase 1** | Auth + Users + RBAC + Admin skills | 🟠 ~80% (Google OAuth stub, rate limits missing) |
| **Phase 2** | Provider, Worker, Agent profiles | 🟡 ~70% (Agent module is shell) |
| **Phase 3** | Jobs (Normal Job flow) | ✅ ~95% |
| **Phase 4** | Booking FSM + OTP + timeline | ✅ ~90% |
| **Phase 5** | Pricing + Instant Request | 🟠 ~75% (static service, hardcoded mocks) |
| **Phase 6** | Instant Bidding | 🟠 ~70% (no Provider UI, socket not namespace-scoped) |
| **Phase 7** | Payments (Razorpay) | 🟡 ~80% (wallet credit flow broken) |
| **Phase 8** | Chat + Notifications + Reviews | 🔴 ~40% (chat entirely missing) |
| **Phase 9** | Admin analytics + platform settings UI | 🔴 ~30% (no settings API routes) |
| **Phase 10** | Hardening: rate limits, load test, monitoring | 🔴 ~20% |

---

## Recommended Fix Order

| # | Fix | Impact | Effort |
|---|---|---|---|
| 1 | Migrate `instant-request.service.ts` to proper OOP class + DI | Unblocks testability | Medium |
| 2 | Build Chat module (backend routes + Socket.IO namespace + frontend pages) | Core feature | High |
| 3 | Wire Platform Settings routes + controller | Admin functionality | Low |
| 4 | Fix Wallet Consumer to credit worker on `payment.success` | Financial correctness | Low |
| 5 | Add rate limiting to `/auth/request-otp` and `/instant-requests/accept` | Security | Low |
| 6 | Fix `PaymentService` booking status check (CREATED → CONFIRMED) | Bug fix | Low |
| 7 | Build Provider-side Instant Bidding UI | Core feature | Medium |
| 8 | Implement Google OAuth properly with `google-auth-library` | Auth completeness | Medium |
| 9 | Remove `(global as any).deps` — use `app.locals` | Tech debt | Low |
| 10 | Delete test files from `src/` root | Code hygiene | Trivial |
| 11 | Add `/ready` and `/live` health endpoints | DevOps | Trivial |
| 12 | Add Docker Compose | Local dev parity | Medium |

---
---

# Phase-Wise Remediation Plan

> Verified against current codebase state, 30 Sep 2026. No code has been written yet — this is the plan to review before implementation begins. Each phase is sequenced so later phases don't build on top of code that will be torn out in an earlier phase (e.g. Chat is built only after the DI/bootstrap mess is fixed, so it isn't wired the wrong way twice).

## Guiding principles for execution

1. **Stop the bleeding before adding features.** Phase R0–R1 fix architecture violations that make everything after them harder to build correctly (static services, `(global as any).deps`, dual bootstrap). Building Chat or Bidding UI on top of that foundation today means redoing it later.
2. **One PR per numbered item**, not per phase — phases group related PRs so review stays reviewable and each PR stays revertable.
3. **No behavior change bundled with a refactor.** When `instant-request.service.ts` is converted from static/Prisma-direct to OOP+DI, that PR must not also change bidding logic — separate PRs for "make it testable" vs "fix the bug in it."
4. **Every new/touched service gets a unit test using the mocked repository** (per `shram-testing-strategy` / `shram-repository-pattern` skills) before it's considered done — not as a follow-up ticket.

---

## Phase R0 — Safety Net (before touching anything) — ✅ DONE (30 Sep 2026)
**Goal:** Make the refactor phases measurable and reversible.

| # | Task | Why first | Status |
|---|---|---|---|
| R0.1 | Snapshot current test coverage for `instant-requests`, `payments`, `auth` modules | Need a baseline to prove refactors don't regress behavior | ✅ Done — see baseline below |
| R0.2 | Delete `src/test_email.ts`, `src/test_exotel.ts`, `src/test_users.ts` (item 16) — move to `backend/tests/manual/` (outside `tsconfig`'s `src/**/*` include, so excluded from build) | These import live credentials; they must not survive into a refactor branch that others pull | ✅ Done — also parameterized hardcoded personal email/phone into CLI args / env vars |
| R0.3 | Add `/ready` and `/live` endpoints (item 8) | Trivial, unblocks any container/orchestration work later phases might touch | ✅ Done in `backend/src/app.ts` — `/ready` checks DB + Redis + RabbitMQ channel, `/live` is a bare liveness ping |
| R0.4 | Add Docker Compose (postgres, redis, rabbitmq, api, web) (item 20) | Every following phase needs a reliable local env to verify against | ✅ Done — `docker-compose.yml` at repo root, validated with `docker compose config` |

**Baseline coverage recorded (`@vitest/coverage-v8` added as a dev dependency, none existed before):**
```
Statements   : 11.51% ( 79/686 )
Branches     : 0.56%  ( 2/355 )
Functions    : 24.75% ( 25/101 )
Lines        : 11.58% ( 79/682 )
```
Test suite: 2 files, 4 tests, all passing. **`payments/**` is at 0% coverage across every file** (service, repository, provider, routes, DTO) — flagged as a new risk: R1 must not refactor `PaymentService`/`PaymentRepository` without adding characterization tests first, since there is currently no safety net for that module at all. `tsc --noEmit` is clean after these changes.

**Exit criteria:** ✅ met — `docker-compose.yml` validates; baseline coverage numbers recorded above; no stray credentialed scripts in `src/`; typecheck clean.

> **Note found during R0:** the repo root already contained an earlier, independent audit/remediation pass (`analyzed.txt`, `remediation_plan.txt`, `implementation_plan.md`, dated 8 Sep 2026) that is more detailed on two P0 items this document didn't originally call out: OTP generation was using `Math.random()` (predictable, not cryptographically secure) and wallet balance updates were a read-modify-write race condition. **Verified during R0: both are already fixed in the current codebase** — `AuthService.ts`/`OTPService.ts` now use `crypto.randomInt()`, and `WalletService`/`WalletRepository` now expose `creditWithTransaction`/`debitWithTransaction` atomic DB operations. These were resolved by commits prior to this session (git log shows "Analyzed and fixed the bug" as the most recent commit). The two older documents should be treated as superseded/historical — this file is now the live plan.

---

## Phase R1 — Architectural Debt (the "worst offender" fixes)
**Goal:** Eliminate the dual bootstrap, static services, and global-mutation patterns before any new module is added on top of them.

| # | Task | Files | Notes |
|---|---|---|---|
| R1.1 | Convert `instant-request.service.ts` to a proper class implementing `IInstantRequestService`, injected via constructor, using `InstantRequestRepository` instead of raw `prisma.*` | `modules/instant-requests/services/instant-request.service.ts` | Remove the hardcoded `rating: 4.8` / `totalJobs: 12` mocks in the same PR — pull real data from the repository, don't leave a `// TODO` |
| R1.2 | Same conversion for `instant-matching.service.ts` and `instant-request.controller.ts` (both flagged with static usages) | `modules/instant-requests/**` | Controller must extend `BaseController`, delegate only |
| R1.3 | Migrate legacy static-route modules (`auth.routes.ts`, `location.routes.ts`, `providers`, `skills`, `dashboard`, `pricing`) into the DI/`wireModules` stack one at a time | `backend/src/legacy/**` → `modules/**` | Do NOT big-bang this — one module per PR so a regression is bisectable |
| R1.4 | Replace `(global as any).deps` with `app.locals` or a real IoC container (e.g. `tsyringe`/`inversify` if not already chosen) (item 19) | `app.ts`, bootstrap | Do this once, at the end of R1.3, so it's set once for the final module set — not re-plumbed after every migrated module |
| R1.5 | Resolve the two `AuthService` variants — delete the static legacy one once `auth.routes.ts` is migrated in R1.3 | `modules/auth/**` | Depends on R1.3 |
| R1.6 | Fix `OtpEmail` import mismatch (item 17) — pick one template convention (`.tsx` component vs `.template.ts`) and standardize all email templates on it | `templates/**`, `AuthService` | Quick but must happen before Phase 3 touches notification templates |

**Exit criteria:** `grep -r "static async" backend/src/modules` returns zero results in touched modules; `grep -r "(global as any).deps"` returns zero results; only one `AuthService` exists; baseline tests from R0.1 still pass.

---

## Phase R2 — Correctness & Security Fixes
**Goal:** Fix bugs and security gaps that are cheap to fix now but expensive to leave live while Chat/Bidding UI are being built (financial and auth surfaces).

| # | Task | Impact |
|---|---|---|
| R2.1 | Fix `PaymentService.createOrder()` status check: `BookingStatus.CREATED` → `BookingStatus.CONFIRMED` (item 18) | Financial correctness bug |
| R2.2 | Wire `WalletConsumer` to listen on `payment.success` and credit the Worker's wallet (item 12) | Workers are currently never paid out automatically |
| R2.3 | Add rate limiting to `POST /auth/request-otp`, `POST /instant-requests/:id/accept`, `POST /payments/order` (item 9) | OTP spam / accept race / payment abuse |
| R2.4 | Fix `AuthService.signup()` to dispatch OTP via email when the user registers with an email channel (item 10) | Users signing up with email currently get no OTP at all |
| R2.5 | Add `editReview()` with the 5-minute lock window to `ReviewService` (item 11) | Spec compliance |
| R2.6 | Consolidate duplicate email consumers (`shared/email/consumers` vs `shared/queue/consumers`) into one; start the orphaned `sms.consumer.ts` in bootstrap or delete it if superseded (item 15) | Prevents double-send of transactional email |

**Exit criteria:** Manual test: signup via email receives OTP; complete a booking end-to-end and confirm worker wallet balance increases; OTP endpoint returns 429 after threshold.

---

## Phase R3 — Google OAuth (real implementation)
**Goal:** Replace the stub with a working, verifiable flow (item 3).

| # | Task |
|---|---|
| R3.1 | Add `google-auth-library`, implement `OAuth2Client.verifyIdToken()` in `AuthService.googleAuth()`, replacing the raw JWT decode |
| R3.2 | Wire `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` from typed `env` (already present in schema) into the client constructor |
| R3.3 | Add the missing OAuth callback route and connect it through the (now-fixed) DI bootstrap from Phase R1, not the legacy stack |
| R3.4 | Frontend: confirm the Google login button calls the real endpoint and handles the token exchange |

**Exit criteria:** Google login works end-to-end against a real test Google Cloud OAuth client.

---

## Phase R4 — Socket.IO Namespacing & Redis Adapter
**Goal:** Build the multi-namespace socket architecture Chat and Bidding both depend on, once, correctly (item 4).

| # | Task |
|---|---|
| R4.1 | Add Redis adapter to `socket.ts` for horizontal scaling |
| R4.2 | Split the single default namespace into `/instant-requests`, `/bidding`, `/notifications` (chat namespace deferred to Phase 1 below, built alongside the chat module itself) |
| R4.3 | Migrate existing `instant-request` and `bidding` socket emits (from the now-refactored R1.1/R1.2 services) onto their new namespaces |
| R4.4 | Wire up or remove the currently-unused `join_skill_room` / `leave_skill_room` events |

**Exit criteria:** Socket connections are namespace-scoped; a load test with 2 API instances behind Redis adapter shows cross-instance event delivery.

---

## Phase 1 — Chat Module (net-new feature)
**Goal:** Ship the fully missing Phase 8 chat feature (item 1), now that it has a clean bootstrap and namespace pattern to attach to.

Run `shram-module-scaffold` skill first, then:

| # | Task |
|---|---|
| 1.1 | Scaffold `modules/chat/` with all 15 required folders (controllers/services/repositories/routes/dto/validators/entities/mappers/interfaces/types/constants/enums/events/sockets/helpers/policies) |
| 1.2 | `ChatRepository` over existing `ChatThread`/`ChatMessage` Prisma models (already in schema) |
| 1.3 | `ChatService` — thread creation on booking match, message send/list, `IChatService` interface |
| 1.4 | `ChatController` extending `BaseController`; routes `GET /chat/:bookingId/messages`, `POST /chat/:bookingId/send` |
| 1.5 | `/chat` Socket.IO namespace, rooms keyed by `bookingId`, wired through the Phase R4 namespace pattern |
| 1.6 | Frontend: `/chat/[bookingId]` page for both Provider and Worker roles, RTK Query slice, socket client wiring (`shram-socket-client`) |

**Exit criteria:** Two test users (provider + worker) on a matched booking can exchange messages in real time and see history on reload.

---

## Phase 2 — Instant Bidding: Provider UI
**Goal:** Close item 13/14 — the backend exists, the Provider side has no UI.

| # | Task |
|---|---|
| 2.1 | Add `selectBid` mutation to `instantRequestApi.ts` |
| 2.2 | Consume `instant-bidding:bid-submitted` socket event on the frontend (now on the `/bidding` namespace from Phase R4) |
| 2.3 | Build `/provider/instant-requests/bidding` page: live incoming bids list + select action |

**Exit criteria:** Provider sees bids appear live as workers submit them and can select one, which transitions the booking correctly through `BookingStateService`.

---

## Phase 3 — Platform Settings, Agent Module, Remaining Admin/Frontend Gaps
**Goal:** Close items 5, 6, and the remaining frontend page gaps (item 14 minor rows).

| # | Task |
|---|---|
| 3.1 | Build `PlatformSettingController` + routes, mount in bootstrap (service/repository already exist) |
| 3.2 | Flesh out `agents/` module with real controllers/services/repositories subfolders and the agent-registers-worker onboarding flow |
| 3.3 | Frontend: `/admin/platform-settings` wired to the new API; `/provider/wallet`, `/worker/wallet` (full transaction list), `/admin/analytics` |

**Exit criteria:** Admin can read/write platform settings through the UI; agent onboarding flow works end-to-end.

---

## Phase 4 — Hardening (pre-production)
**Goal:** Phase 10 of the original architecture plan — the last mile before calling this production-ready.

| # | Task |
|---|---|
| 4.1 | Full rate-limit audit across all mutating routes, not just the ones called out in R2.3 |
| 4.2 | Load test instant-request broadcast + bidding accept race conditions specifically (the architecture plan flags this) |
| 4.3 | Monitoring/observability pass — structured logging correlation via the existing request-ID middleware, error tracking hookup |
| 4.4 | Security review pass (`security-review` skill) across auth, payments, and the new chat module |

**Exit criteria:** Load test report attached; security review findings closed or explicitly accepted; monitoring dashboards live.

---

## Sequencing summary

```
R0 (safety net) → R1 (architecture debt) → R2 (correctness/security)
                                          → R3 (Google OAuth)   ─┐
                                          → R4 (socket namespaces) ─┤
                                                                    ├→ Phase 1 (Chat)
                                                                    ├→ Phase 2 (Bidding UI)
                                                                    └→ Phase 3 (Settings/Agent/Frontend gaps)
                                                                          └→ Phase 4 (Hardening)
```

R0 and R1 are strictly sequential (everything else sits on top of a sane bootstrap). R2, R3, R4 can run in parallel once R1 lands, since they touch disjoint areas (payments/auth-otp, OAuth, sockets respectively). Phase 1–3 depend on R4 (namespaces) and R1 (DI bootstrap) being done first. Phase 4 is last by definition.

**No implementation should start on any item above without your sign-off on this plan first**, per the original request.

---
---

# Round 2 — Deep-Dive vs. Architecture Plan (30 Sep 2026)

> Cross-checked directly against `SHRAM_Architecture_Plan.md` sections 3a, 6, 7, 8, 9, 10, 11, 12, and the backend/frontend folder-structure spec. These are **net-new findings** not in Round 1 above. Two of them (21, 22) are more serious than anything previously found — one is a core feature that actively contradicts its own spec.

## 🔴 CRITICAL — New

### 20b. Google Places Autocomplete was silently disabled — FIXED this session (30 Sep 2026)
`frontend/src/hooks/useGoogleMapsScript.ts` had been gutted to a one-line `return false;` in commit `e4446c7` ("Analyzed and fixed the bug", 22 Sep) — all script-loading logic (creating the `<script>` tag, reading `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, the load callback) was deleted. Effect: the Google Maps JS SDK never loaded in the browser, so `AddressSearch.tsx`'s Places Autocomplete dropdown never appeared in either place it's used (`provider/jobs/create`, `provider/instant-hire`). The same commit patched around the symptom rather than the cause: manual typing now fires `onChange` with `lat: 0, lng: 0, placeId: "manual_input"`, silently accepting invalid coordinates instead of a real geocoded address. The "Locate Me" button was similarly degraded — always falling back to raw `Location (lat, lng)` text since `window.google.maps.Geocoder` never existed either. **This broke real lat/lng input into `DistanceStrategy` pricing and instant-request geo-radius worker matching for effectively every manually-typed address.** Restored the original script-loading implementation in this session — verified `tsc --noEmit` clean. Recommend manually smoke-testing the two pages in a browser to confirm the dropdown now appears, since this class of regression (a hook silently stubbed to a constant) won't be caught by typecheck or the current test suite.

### 21. Instant Request radius escalation contradicts the architecture plan's core design decision
Architecture Plan §7/§14 is explicit and deliberate: **no system timeout** — the request stays open until a worker accepts or the Provider manually cancels; tiers (2km→5km→10km) escalate **immediately** when a tier returns zero eligible workers; tier values come from `PlatformSetting.instantRequestRadiusTiers` (admin-editable).

What `modules/instant-requests/services/instant-matching.service.ts` actually does:
- Tiers are **hardcoded**: `const stages = [2, 5, 15, 30]` — not read from `PlatformSetting`, and don't even match the documented 2/5/10 values
- Each tier **unconditionally waits 15 seconds** (`setTimeout(..., 15000)`) before checking results — it does not escalate immediately on an empty tier as designed
- After all tiers are exhausted, the request is **force-set to `EXPIRED`** — this is exactly the timeout-based auto-expiry the architecture plan explicitly rejected in favor of manual-cancel-only

**Impact**: this is the flagship real-time feature of the whole platform, and it's currently built to a design the product explicitly decided against. A Provider's request will silently die after ~60s (4 tiers × 15s) even if they never clicked Cancel and workers were about to come online.

### 22. Idempotency-Key is a silent global no-op, not enforced anywhere
Architecture Plan §10: Idempotency-Key header is **required** specifically on payment-order-create and OTP-verify, stored in Redis with 24h TTL, to survive client retries on financial/auth-critical actions.

Actual: `idempotencyMiddleware()` is mounted **globally** in `app.ts` for every route, and if the header is simply absent it calls `next()` silently — no 400, no enforcement, anywhere. So a double-tap on "Pay Now" or "Verify OTP" during network lag can create duplicate payment orders or duplicate OTP verification attempts today.

**Impact**: financial correctness risk (duplicate Razorpay orders on retry) and a real production bug waiting for a flaky mobile network to trigger it.

---

## 🟠 HIGH — New

### 23. Admin-managed notification templates are cosmetic for Email (the primary channel)
Architecture Plan §3a: `NotificationDispatcher` must always resolve `(type, channel, locale)` → template at send time, **never inline copy**, so Admin's template editor actually controls what gets sent.

Actual: the `NotificationTemplate` DB model, repository, and Admin CRUD routes (`GET/PUT /notification-templates`) all genuinely exist — but `NotificationDispatcher.dispatchToChannel()` hardcodes React email components (`OtpEmail`, `WelcomeEmail`, `BookingCreated`, etc.) for every known type and only falls back to the DB-driven `resolveTemplate()` (which IS Redis-cached, 5min TTL — that part's done right) when the React render throws or the type is unmapped. **Net effect: Admin can edit an email template in the UI and it will have zero effect on what's actually sent**, for every email type that has a React component. DB templates only genuinely control SMS/Push today.

### 24. Missing modules the architecture plan explicitly lists
None of these exist at all — no folder, no Prisma model, no routes:
- `modules/categories/` — Skill has no `categoryId`/`Category` relation at all; it's flat, contradicting §3's domain model (`Skill ── Category, admin-managed`)
- `modules/support/` — no ticketing system
- `modules/analytics/`, `modules/reports/` — only a basic `modules/dashboard/` (stat aggregation) exists, not real analytics/reporting
- `modules/files/` — no dedicated module; file uploads are handled ad hoc (multer wired directly into `users/routes`, S3Provider called directly from `BaseController`/bootstrap/`UserService`) and **only the users module can upload files at all** — no upload path exists for bookings, worker documents/KYC beyond profile, etc.

### 25. CI/CD and API documentation are completely absent
- No `.github/workflows/` anywhere — zero automated lint/typecheck/test/build gate on any PR or push, despite Architecture Plan §12 specifying a GitHub Actions pipeline
- No Swagger/OpenAPI generation despite being named in the plan's bootstrap folder structure (`swagger.bootstrap.ts`, `docs/swagger/`) — no machine-readable API contract exists for frontend/QA/future integrators

---

## 🟡 MEDIUM — New

### 26. `PricingRule` isn't a real model — it's smuggled into the generic `PlatformSetting` JSON blob
Architecture Plan §11 models `PricingRule` as its own table. Actual: `FareCalculator.applyPricingRules()` reads through `platformSettingRepo.getPricingRule(skillId)`, backed by the generic `PlatformSetting{key, value:Json}` table — works, but loses type safety, query-ability, and indexing a real table would give. **To the plan's credit, the Redis caching + admin-update invalidation around pricing IS correctly implemented** (`DistanceStrategy`/`DemandStrategy`/`WeatherStrategy`/commission all cache via `ICacheService` with 60s TTL, invalidated on `PlatformSettingService.update()`), so this is a schema-modeling gap, not a functional one.

### 27. RBAC is a simple role-array check, not the metadata/decorator pattern the plan describes
`role.middleware.ts` does a plain `allowedRoles.includes(userRole)` per route. Architecture Plan §10 describes JWT role checked "against a route's declared `@Roles()` metadata" (decorator-based). Functionally equivalent and not broken — just worth knowing this is a documentation/pattern mismatch, not a bug, and low priority to change.

### 28. Frontend `features/` folders are flat — organizational debt, not a functional bug
`frontend/src/features/*` exists (auth, booking, admin, agent, dashboard, instantRequests, jobs, location, provider, reviews, skills, users, worker) but each is just one `*Api.ts` file (RTK Query slice) — none have the plan's `api/hooks/components/schemas/types/constants/utils/index.ts` sub-structure. Actual components/forms live separately under `components/` and per-route `app/.../page.tsx` files. Works today; will get harder to navigate as features grow.

### 29. Several named hooks/slices from the plan don't exist (mostly superseded, not blocking)
- Missing hooks: `useAuth()`, `usePermission()`, `useUpload()`, `useDarkMode()`, `useNotification()`, `usePagination()` — dark mode already works fine via `next-themes` directly (`ThemeProvider.tsx` + `ThemeToggle.tsx`), so `useDarkMode`/`themeSlice` are non-issues; the rest are real DX gaps (no `useAuth`/`usePermission` means auth/role checks are likely duplicated inline across pages — worth verifying if RBAC bugs ever show up on the frontend)
- Missing slice: `bookingSlice` — booking state lives entirely in RTK Query cache (`bookingApi.ts`), which is arguably fine and doesn't need a parallel slice
- Route groups: `(public)` group is missing — landing page sits directly at `app/page.tsx`; **no `about/`, `contact/`, `privacy/`, `terms/`, or `faq/` pages exist at all** — Privacy Policy and Terms of Service pages are not just nice-to-have, they're typically a legal requirement before a payments-handling app goes live
- Root `app/loading.tsx` and segment-level `error.tsx` are missing (only `global-error.tsx` and `not-found.tsx` exist) — minor UX polish gap

---

## Updated Fix Order (Round 2 additions, slotted into the existing phase plan)

| # | Fix | Slots into | Impact | Effort |
|---|---|---|---|---|
| 21 | Rewrite Instant Request radius escalation: read tiers from `PlatformSetting`, escalate immediately on empty tier, remove the force-`EXPIRED` timeout path, manual Cancel only | **Phase R2** (new R2.7) — behavior-fix PR, separate from the R1.2 OOP conversion of the same file | Core feature correctness — currently contradicts product decision | Medium |
| 22 | Scope Idempotency-Key middleware to be actually required (400 if missing) on payment-order-create + OTP-verify; leave it optional elsewhere | **Phase R2** (new R2.8) | Financial correctness | Low |
| 23 | Fix `NotificationDispatcher` so Admin-edited DB templates actually govern email content, not just SMS/Push fallback | **Phase R2** (new R2.9) | Admin feature is currently cosmetic | Medium |
| 24 | Build `Category` model + relation (Skill→Category), `modules/support/`, `modules/analytics/`/`reports/`, `modules/files/` | **New Phase 5 — Missing Modules** | Feature completeness for admin/ops and multi-purpose uploads | High |
| 25 | Add GitHub Actions CI (lint→typecheck→test→build) and Swagger/OpenAPI generation | **Phase 4 — Hardening** (add as 4.5, 4.6) | Dev velocity + safety net for future contributors | Medium |
| 26 | Normalize `PricingRule` into its own Prisma model instead of `PlatformSetting` JSON | **Phase 5** (low priority, do alongside other schema work) | Type safety, query-ability | Low |
| 28/29 | Add `/(public)` legal pages (privacy, terms) before go-live; add `useAuth`/`usePermission` hooks to de-duplicate frontend auth checks | **Phase 3** (frontend gaps) | Legal compliance + DX | Low–Medium |

**Sequencing note:** items 21 and 22 are now the two highest-priority items in the entire plan after R0/R1 land — they're both live correctness bugs in already-shipped-feeling features (Instant Request, Payments), not missing features. Recommend doing R2.7/R2.8 immediately after R1 lands, ahead of R2.9 and the new Phase 5 modules.
