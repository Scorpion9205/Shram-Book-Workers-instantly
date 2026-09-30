# SHRAM — Final Implementation Plan
> Consolidates: architecture-compliance audit (`shram_audit.md`, Rounds 1–2) + this session's full correctness bug hunt (Round 3, 30 Sep 2026). This is the single document to work from going forward.

---

## How to read this document

1. **Part A — Bug Registry**: every confirmed, verified correctness bug in the codebase today, with file:line, failure scenario, and fix. IDs are stable (`AUTH-01`, `BOOK-03`, etc.) — reference them in commits/PRs. **Status column added 30 Sep 2026** — ✅ Fixed / ⏳ Deferred (waiting on R1 refactor, see Part C).
2. **Part B — Missing Features & Architecture Debt**: condensed from `shram_audit.md` Rounds 1–2 (full detail stays in that file; this is the executive summary for planning).
3. **Part C — Phase-Wise Execution Plan**: the actual sequencing — which bugs are safe to fix today vs. which must wait for an architecture refactor to land first, so we don't fix code that's about to be rewritten.
4. **Part D — What I need from you**: API keys / access required for specific verification steps, called out at the point they're needed.

## Progress — Phase 0 and Phase 1 are DONE (30 Sep 2026)

All of Phase 0 and all of Phase 1 (every bug marked ✅ below — 24 of 30) have been fixed, typechecked clean on both `backend` and `frontend`, and the backend test suite passes (5/5, including a new test added for the booking-transition race-condition fix). **5 bugs remain deliberately deferred** — `BOOK-02`, `BOOK-04`, `BOOK-05`, `RADIUS-01`, and half of `DATA-02` — because they live in `instant-request.service.ts`/`instant-matching.service.ts`, which Phase R1 (architecture debt) is about to rewrite from static methods to OOP+DI; fixing them now would mean fixing bugs in code that's about to be torn out. They'll be fixed as follow-up PRs immediately after R1 lands (see Part C, Phase 3).

**What's next:** Phase R1 (architecture debt — converting `instant-request.service.ts` off static methods/raw Prisma, migrating legacy routes onto the DI stack, removing `(global as any).deps`), then the 5 deferred bugs above, then the remaining phases (missing modules, hardening).

---

# Phase 0 — Already done (last session)

- ✅ `/ready`, `/live` health endpoints added
- ✅ Credentialed manual test scripts moved out of `src/`, parameterized
- ✅ `docker-compose.yml` added (postgres, redis, rabbitmq, api, web)
- ✅ Baseline test coverage recorded (11.51% overall; `payments/**` at 0%)
- ✅ **`useGoogleMapsScript.ts` fix** — was stubbed to `return false`, silently disabling Places Autocomplete on every address field. Restored. Needs a manual browser smoke-test to confirm the dropdown now appears (not yet done).

---

# Part A — Bug Registry (30 new bugs, verified this session)

Severity counts: **9 Critical · 10 High · 9 Medium · 2 Low**

## Status at a glance (30 Sep 2026)

✅ = fixed and verified (typecheck + test suite green) · ⏳ = deferred until after the R1 architecture refactor lands (see Part C)

| Group | Status |
|---|---|
| `AUTH-01` `AUTH-02` `AUTH-03` `AUTH-04` `AUTH-05` `AUTH-06` `AUTH-07` `AUTH-08` | ✅ all fixed |
| `IDEM-01` (from Part B, fixed alongside `AUTH-06`) | ✅ fixed |
| `BOOK-01` `BOOK-03` `BOOK-06` `BOOK-07` | ✅ fixed |
| `BOOK-02` `BOOK-04` `BOOK-05` | ⏳ deferred — same file as R1's OOP conversion target |
| `PAY-01` `PAY-02` `PAY-03` `PAY-04` `PAY-05` | ✅ all fixed |
| `FE-01` `FE-02` `FE-03` `FE-04` `FE-05` `FE-06` | ✅ all fixed |
| `DATA-01` `DATA-03` `DATA-04` `DATA-05` `DATA-06` | ✅ fixed |
| `DATA-02` | 🟡 half-fixed — the `AdminService` side (removes a suspended worker from the geo index) is done; the `instant-matching.service.ts` defense-in-depth check is deferred with `BOOK-02/04/05` |
| `RADIUS-01` (Part B) | ⏳ deferred — same file as above |

## A1. Auth & Security

| ID | Sev | Location | Bug | Failure scenario | Fix |
|---|---|---|---|---|---|
| **AUTH-01** | 🔴 Critical | `AuthService.ts:81-82,178-186` | Signup cache is keyed only by `phone`, but a second OTP is also issued for `email`. Verifying via the email OTP looks up a cache key that was never set. | Signup with email channel + WORKER/AGENT role → cache miss → role silently defaults to `PROVIDER`, `phone` set to `''`. Second such signup ever attempted crashes with a Prisma `P2002` (phone is `@unique`) because two users now both have `phone: ''`. | Key the signup cache by whichever identifier is present (email and/or phone), not phone-only; fail closed (reject) instead of defaulting to PROVIDER when no cached signup data is found. |
| **AUTH-02** | 🔴 Critical | `AuthService.ts:301` | Refresh-token verification: `jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret')` — hardcoded fallback secret, and reads `process.env` directly instead of the validated `env` config (`TokenService` correctly uses `env.JWT_REFRESH_SECRET` to *sign*; this line uses a different path to *verify*). | If `JWT_REFRESH_SECRET` is ever unset in the process at runtime (misconfig, a worker that doesn't load `config/env.ts` first), this line silently accepts `'fallback-refresh-secret'` as valid — anyone can forge a refresh token offline and mint access tokens for any user. | Use `env.JWT_REFRESH_SECRET` only, no fallback string, ever. |
| **AUTH-03** | 🟠 High | `auth.routes.ts:45`, `AuthService.ts:212-236` | `POST /admin/login` (password-based) has no rate limiting or lockout anywhere in the stack — only OTP flows have an attempt counter. | Unlimited online brute-force of any admin/agent email's Argon2-hashed password, no throttling. | Apply the existing `rateLimiter` middleware to this route; add per-account lockout after N failed attempts. |
| **AUTH-04** | 🟡 Medium | `rateLimiter.middleware.ts:96-104` | On any Redis error, the limiter's `catch` block just logs and calls `next()` — fails **open**. | A transient Redis blip (reconnect, timeout) means every request bypasses rate limiting entirely for its duration — a window for unlimited login/OTP attempts. | Decide explicitly: fail closed (reject) for auth-sensitive routes, fail open only for low-stakes ones. Currently it's open everywhere with no decision made. |
| **AUTH-05** | 🟡 Medium | `OTPService.ts:86-95` | `enforceRateLimit` does `get(key)` then `incr(key)` as two separate Redis round-trips (check-then-act, not atomic). | Concurrent `requestOTP` calls can all read the same pre-increment count and all pass the `< MAX_PER_HOUR` check before any increments — burst can exceed the intended cap, each triggering a real (billed) SMS/email send. | Use a single atomic `INCR` first, compare the *returned* value against the limit. |
| **AUTH-06** | 🟡 Medium | `idempotency.middleware.ts:15-34` | Does `GET` (check) then, only *after* the handler runs, a fire-and-forget `redis.set(...)`. No `SET NX` lock claimed up front. | Two concurrent requests with the same `Idempotency-Key` both pass the initial check (neither has written yet) and both execute the handler — duplicate side effects still possible even where the header IS sent. **Combine this fix with the Round-2 finding that the header isn't even required on payment/OTP routes today (see `IDEM-01` in Part B) — same file, one PR.** | Claim the key with an atomic `SET NX` before running the handler, not after. |
| **AUTH-07** | ⚪ Low | `OTPService.ts:100-110` | Email OTP send failure (React-Email render/send) is caught and silently falls back to plain text with no log line. | A template-compilation regression in production leaves zero trace unless the plain-text fallback *also* fails. | Log the caught error even when falling back successfully. |
| **AUTH-08** | ⚪ Low | `TokenService.ts:41-49`, `AuthService.ts:301` | `jwt.verify` calls don't pass an explicit `algorithms: ['HS256']` allowlist. | Low risk today (HMAC-only), but cheap defense-in-depth against algorithm-confusion if an RSA/JWKS verifier is ever added later. | Add the explicit allowlist now while it costs nothing. |

**⚠️ Before fixing AUTH-01/AUTH-02:** Round 1 of the audit found **two `AuthService` variants** — one proper DI class (what the agent read, at `modules/auth/services/AuthService.ts`), and a static legacy duplicate that `auth.routes.ts` (mounted directly in `app.ts`'s "legacy stack") may actually be calling in production. **Verify which file is live on `/api/v1/auth` before fixing** — if it's the static duplicate, either the same bugs need fixing there too, or (better) do the R1.5 consolidation first so the fix only needs to happen once. This is flagged explicitly in Part C's sequencing.

## A2. Booking FSM & Instant Requests

| ID | Sev | Location | Bug | Failure scenario | Fix |
|---|---|---|---|---|---|
| **BOOK-01** | 🔴 Critical | `BookingStateService.ts:30-56`, `BookingRepository.ts:91-105` | `transition()` reads `booking.status` outside any transaction, validates, then writes with a plain `update()` — no `WHERE status = fromStatus` guard, no version column, no isolation level set. | Provider cancels while worker calls `workerEnRoute` at the same instant — both read the same stale status, both pass validation, both write. Last write wins; both write history rows citing the same (now-wrong) `fromStatus`, corrupting the audit trail. | Make the write a conditional `updateMany({ where: { id, status: fromStatus } })`, check `count === 1`, reject/retry on 0 — inside the same transaction as the read. |
| **BOOK-02** | 🟠 High | `instant-request.service.ts:301-332` (acceptRequest), `:721-812` (selectBid) | Redis lock is scoped per-request-item, never per-worker. `worker.isAvailable` is read *before* any lock is acquired. | Same worker races two different instant-requests (or an accept + a bid-select) concurrently — each acquires its own distinct lock, each sees `isAvailable: true`, each creates a Booking. Worker ends up double-booked on two live jobs. | Lock keyed on `worker.id`, or a conditional `updateMany({ where: { id, isAvailable: true } })` guard before booking creation, inside the transaction. |
| **BOOK-03** | 🟠 High | `instant-request.validation.ts`, `location.validation.ts` | `latitude`/`longitude` are bare `z.number()` — no bounds check. | `latitude: 999` passes validation, reaches Redis `GEOSEARCH`, which throws; the error is only `.catch(err => console.error(...))`'d at the call site — the request never reaches its `EXPIRED` fallback either, so it stays `OPEN` forever with no worker ever notified and no error surfaced to the Provider. | Add `.min(-90).max(90)` / `.min(-180).max(180)` to both schemas. **Safe to fix immediately — no dependency on any refactor.** |
| **BOOK-04** | 🟡 Medium | `instant-request.service.ts:410-425,764-773` | Booking creation from an accepted instant-request/bid sets `status: WORKER_ASSIGNED` via a direct `tx.booking.create`, bypassing `BookingStateService.transition()` entirely. | Every booking that originates from an instant request has **zero audit history** until (if ever) its next transition — violates the FSM's own invariant. | Route initial booking creation through the state service too, or write the first `BookingStatusHistory` row explicitly at creation time. |
| **BOOK-05** | 🟡 Medium | `instant-request.service.ts:408,761`, `BookingService.ts:90` | Work-start OTP (`Booking.startOtp`) is generated and stored **in plaintext**, compared with a raw `!==`. Directly contradicts AGENTS.md's "OTP codes hashed with Argon2id before storage" rule. | Anyone with DB read access (or a log/dump leak) obtains the code that gates `WORK_STARTED`. | Hash with Argon2id before storage, verify via `OTPService.verify()` like every other OTP purpose. |
| **BOOK-06** | 🟡 Medium | schema: `Booking.finalFare` | Never written anywhere in the booking lifecycle — `settlePayment`/`completeBooking` only call `stateService.transition()`, none set `finalFare`. | Any invoice/payout-reconciliation consumer relying on `finalFare` always gets `null`, even for `CLOSED` bookings. | Set `finalFare` at the point the final amount is known (payment settlement), through the repository. |
| **BOOK-07** | 🟡 Medium | `shared/services/pricing/fare.service.ts:8-31` | `calculateInstantFare` does money math in plain floating-point `number` (`subtotal * 0.10` etc.), then stores into a `Decimal` column. | Non-round rates/worker-counts produce values like `1099.9890000000001`, persisting float rounding artifacts into a financial column. | Use `Prisma.Decimal` arithmetic throughout, not `number`. |

**⚠️ Sequencing note:** BOOK-02, BOOK-04, BOOK-05 all live in `instant-request.service.ts`, which **Phase R1 of the architecture plan already schedules for a full static→OOP+DI rewrite**. Fixing these bugs in the current static file and then rewriting the file immediately after is wasted work. **These three should be fixed as separate follow-up PRs immediately after the R1.1 OOP conversion lands, not before.** BOOK-01, BOOK-03, BOOK-06, BOOK-07 have no such dependency — safe to fix now.

## A3. Payments, Wallet, Notifications, Pricing

| ID | Sev | Location | Bug | Failure scenario | Fix |
|---|---|---|---|---|---|
| **PAY-01** | 🔴 Critical | `PaymentService.ts:81-82`, `app.ts:44` | Webhook signature is verified against `JSON.stringify(req.body)` — a **re-serialized** copy — not the raw bytes Razorpay actually signed. `express.json()` is applied globally with no raw-body exclusion for the webhook route. | `JSON.parse`→`JSON.stringify` isn't guaranteed byte-identical (key order, whitespace, unicode escaping can differ) — genuinely valid webhooks can fail signature verification unpredictably. | Capture the raw body via `express.json({ verify: (req,res,buf) => req.rawBody = buf })` or mount `express.raw()` for just the webhook route, and HMAC the untouched buffer. |
| **PAY-02** | 🔴 Critical | `rabbitmq.bootstrap.ts:39-40`, `WalletConsumer.ts:31`, `CleanupConsumer.ts:26` | `ANALYTICS`/`CLEANUP` queues have no dead-letter-exchange (unlike `NOTIFICATION`, which does). Consumers `nack(msg, false, false)` on any error — discarded forever, no trace. | Booking hits `PAYMENT_SETTLED`, `WalletConsumer` picks it up to credit the worker — a transient DB blip throws inside `creditWallet` — the event is nacked and **permanently lost**. Worker never gets paid for that booking, with zero recoverable trail. | Add `x-dead-letter-exchange` to both queues (matching `NOTIFICATION`'s pattern), and/or retry-with-backoff before dropping. |
| **PAY-03** | 🟠 High | `FareCalculator.ts:36-40` | Every pricing strategy call is wrapped in `.catch(() => 0)` "for failure isolation" — including `BaseRateStrategy`, whose failure (e.g. deleted skillId) should abort pricing, not zero it out. | A booking can price at exactly **₹0** if the base rate strategy throws and other strategies are near-zero (normal demand, no rain, short job) — Provider gets charged nothing, worker gets paid nothing. | Only apply failure-isolation to genuinely optional strategies (demand/weather); let `BaseRateStrategy` errors propagate and assert `estimatedFare > 0` before returning. |
| **PAY-04** | 🟠 High | `PaymentService.ts:98-112` | `findByOrderId` → check status → `updateStatus` → `transition()` are three unsynchronized steps, no transaction, no conditional update. Razorpay retries webhooks on any non-2xx and fires both `payment.captured` and `order.paid` for the same order. | Two concurrent webhook deliveries both read `status === PENDING` before either writes — both confirm payment, both transition the booking, both fire the confirmation event — Provider gets the booking-confirmed email/SMS/push **twice**. | Single DB transaction with a conditional `UPDATE ... WHERE status = 'PENDING'`, checking affected-row count so only one delivery wins. |
| **PAY-05** | 🟡 Medium | `NotificationDispatcher.ts:169-171` | A failed email/SMS/push send is caught and only logged — never rethrown. The consumer acks the message believing it succeeded. | Resend/SMS provider has an outage exactly when a booking confirms — Provider is never notified, no DLQ entry, no retry, no operator alert. | Rethrow (or track + requeue/DLX) instead of catch-and-log, at least for the primary confirmation channel. |

*(Wallet's atomic `creditWithTransaction`/`debitWithTransaction` paths were re-verified this round — confirmed clean, all callers go through them correctly, no bypass found.)*

**All five of these are safe to fix immediately** — `payments`/`wallet`/`notifications`/`pricing` modules are already proper OOP+DI classes, not part of the R1 legacy rewrite.

## A4. Frontend

| ID | Sev | Location | Bug | Failure scenario | Fix |
|---|---|---|---|---|---|
| **FE-01** | 🔴 Critical | `provider/instant-hire/page.tsx:182-191` | `handleSelectBid` bypasses RTK Query, uses `localStorage.getItem("token")` (real key is `shram_access_token`) and a relative `fetch()` URL that resolves against the frontend origin, not the backend — no Next.js rewrite exists. | **Bid selection is completely broken** — every attempt 404s/returns empty. The entire Instant Bidding confirmation flow doesn't work today. | Add a proper `useSelectBidMutation` to `instantRequestApi` using the shared `apiSlice`/`baseQueryWithReauth`, remove the raw `fetch`. |
| **FE-02** | 🔴 Critical | `provider/instant-hire/page.tsx:127-133` | Page does `socket.on("bookingUpdated", ...)` then on unmount `socket.off("bookingUpdated")` with **no handler reference** — this removes **all** listeners for that event on the shared socket, including `SocketProvider`'s app-wide global one. | Provider visits `/provider/instant-hire` once, navigates away — the app's global booking-status toast/redirect logic is permanently dead for the rest of the session. | Capture the handler in a named const, pass it to `.off(event, handler)` — never bare `.off(event)` on a shared socket instance. |
| **FE-03** | 🟠 High | `instantRequestApi.ts:111-123` | `calculateFare`'s type requires `lat`/`lng`, the page passes real coordinates, but the actual request body only sends `{ items }` — location is silently dropped. | **Every** fare estimate is computed with zero location context — any distance/zone-based pricing is wrong for 100% of requests, not just ones with bad address data. | Include `latitude`/`longitude` in the actual POST body. |
| **FE-04** | 🟠 High | `AuthInitProvider.tsx:27-32` | On mount, reads `token` once, calls `getMe()`. If that 401s and triggers a silent refresh (new token dispatched + saved), `getMe()` still resolves — `init()` then dispatches `setCredentials` using the **original pre-refresh token variable**, overwriting the just-rotated valid token with the stale one in both Redux and localStorage. | App loads with an expired token → refresh succeeds internally → gets immediately clobbered by the stale value → every subsequent request 401s again → possible refresh loop or forced logout despite a valid refresh having just happened. | Read the token from the post-refresh Redux state, not the captured local variable. |
| **FE-05** | 🟡 Medium | `jobsApi.ts:166-173` | `acceptApplication`'s `invalidatesTags` doesn't include the `Job` tag that `getJobById` provides. | Provider accepts an applicant — applicant list refreshes, but the job status badge keeps showing "OPEN" until a manual reload. | Add `{ type: "Job", id: jobId }` to `invalidatesTags`. |
| **FE-06** | 🟡 Medium | `instantRequestApi.ts:74-96` | `createInstantRequest` defaults to a **hardcoded Delhi coordinate** (`28.6139, 77.209`) whenever `lat`/`lng` is `undefined`. | Any caller that omits coordinates (current bug, or a future form regression) silently broadcasts the request near Delhi regardless of the Provider's real city — passes any truthy/non-zero check downstream, so it fails silently rather than loudly. | Throw/validate instead of defaulting to a real-world coordinate. |

*(A leftover `alert(JSON.stringify(err))` debug call in `worker/jobs/[jobId]/page.tsx:35` and an unused, currently-dead `useInstantRequestSocket.ts` hook — which would reproduce FE-02's exact bug if ever wired up — were noted but not counted as active bugs.)*

**All six are safe to fix immediately** — none depend on backend architecture work.

## A5. Admin, Jobs, Data Integrity

| ID | Sev | Location | Bug | Failure scenario | Fix |
|---|---|---|---|---|---|
| **DATA-01** | 🔴 Critical | `AdminService.ts:62-82` (`assignWorker`) | Writes `workerId` directly via raw update, **then** calls `bookingStateService.transition(..., WORKER_ASSIGNED, ...)` afterward — wrong order, not transactional together. `WORKER_ASSIGNED` is only valid from `PAYMENT_CONFIRMED`. | Admin reassigns a worker on a booking that's `WORK_STARTED`/`CLOSED`/`CANCELLED_*` — the `workerId` overwrite **persists immediately**, then `transition()` throws. Booking is left with a corrupted worker assignment and no audit trail, even though the API call reported failure. | Validate the FSM transition is legal *before* touching `workerId`, in one transaction. |
| **DATA-02** | 🟠 High | `AdminService.ts:41-55` (`suspendUser`), `instant-matching.service.ts:30-42` | Suspending a user never removes them from the Redis geo index; the matching query filters `isAvailable`/`role` but never `user.isActive`. | Admin suspends a worker who's currently `isAvailable: true` — they stay in the geo set and keep receiving (and can accept) instant-request/bidding notifications after suspension. | Remove from geo index on suspend; add `user.isActive: true` to the eligibility query as defense-in-depth. |
| **DATA-03** | 🟠 High | `ApplicationService.ts:131-153` (`acceptApplication`) | `requiredWorkers` decremented with a plain `{ decrement: N }`, no `WHERE requiredWorkers >= N` guard — the "job full" check runs inside each transaction independently. | Job needs 1 worker, has 2 pending applications — both get accepted concurrently, both transactions pass their independent check, both create bookings. Job overbooked, `requiredWorkers` can go negative. | Conditional `updateMany` with a `requiredWorkers: { gte: N }` guard, check affected-row count. |
| **DATA-04** | 🟡 Medium | `location.services.ts:28-33` | Location-ping geo-indexing only checks `worker.isAvailable`, never `user.isActive` — compounds DATA-02. | A deactivated-but-still-"available" worker pings `/location` and gets **re-added** to the geo set even after suspension. | Gate on `worker.isAvailable && user.isActive`. Small, isolated, safe to fix immediately even though `location` is a legacy-stack module. |
| **DATA-05** | 🟡 Medium | `ApplicationRepository.ts:11-14` | Duplicate-apply check is check-then-act; relies on the DB's `@@unique([jobId, workerId])` as the real backstop, but nothing catches the resulting Prisma `P2002`. | Worker double-clicks "Apply" — second request's `create()` throws `P2002`, which isn't an `AppException`, so the global error handler returns a generic `500` instead of `409 ALREADY_APPLIED`. | Catch `P2002` in the repository, rethrow as `BusinessException('ALREADY_APPLIED')`. |
| **DATA-06** | ⚪ Low | Multiple: `worker.validation.ts:4` (bio), `provider.validation.ts:9,11`, `job.validation.ts:9-11`, `user.validation.ts:4-10`, `review.validation.ts:10-12` | Free-text fields with no `.max()` bound and no sanitization. | Oversized rows, or a stored-XSS payload if any of these are ever rendered unescaped on the frontend. | Add `.max(N)` bounds across these DTOs; escape on output as defense-in-depth. |

*(Reviewed and confirmed clean, no bug found: `ReviewService.createReview`'s completion-state + duplicate-submission guards; Admin's paginated list endpoints.)*

**DATA-01, DATA-03, DATA-05, DATA-06 are safe to fix immediately** (admin/jobs modules are proper DI). **DATA-02/DATA-04 are partially blocked** — the `AdminService` half is safe now, but the `instant-matching.service.ts` half should wait for its R1.2 rewrite like BOOK-02/04/05 above.

---

# Part B — Missing Features & Architecture Debt (summary — full detail in `shram_audit.md`)

Carried forward from Rounds 1–2, **still open**, not re-litigated here:

| Theme | Items |
|---|---|
| **Architecture debt** | Dual bootstrap (`(global as any).deps`), static/raw-Prisma services in `instant-requests`, two `AuthService` variants, legacy route modules not yet on DI |
| **Still-contradicting-spec bugs** | `RADIUS-01`: instant-request radius escalation uses hardcoded tiers + 15s sleeps + force-`EXPIRED`, contradicting the "no timeout, manual cancel only" design. `IDEM-01`: Idempotency-Key not enforced as required anywhere (combine fix with `AUTH-06` above). `NOTIF-01`: Admin-edited email templates are cosmetic — `NotificationDispatcher` hardcodes React components for Email, DB templates only govern SMS/Push. |
| **Missing modules** | Chat (entire module), Category (Skill has no relation to it), Support/ticketing, Analytics/Reports, dedicated Files module, Google OAuth (stub only), Platform Settings routes/controller, Agent module internals |
| **Missing infra** | CI/CD (no `.github/workflows/` at all), Swagger/OpenAPI, Socket.IO namespacing (`/chat`, `/bidding`, `/notifications`) |
| **Schema/modeling** | `PricingRule` smuggled into generic `PlatformSetting` JSON instead of its own model |
| **Frontend structural** | `(public)` route group + legal pages (Privacy/Terms — **recommend before go-live**, likely a legal requirement for a payments app), flat `features/` folders, missing `useAuth`/`usePermission` hooks |

---

# Part C — Phase-Wise Execution Plan

## Phase 1 — Immediate, isolated bug fixes (no architecture dependency) — ✅ DONE (30 Sep 2026)
*Everything here can be fixed today, independently, in small reviewable PRs — grouped by module so related fixes land together.*

**1a. Payments / Wallet / Notifications / Pricing** — `PAY-01, PAY-02, PAY-03, PAY-04, PAY-05` ✅
**1b. Admin / Jobs** — `DATA-01, DATA-03, DATA-05, DATA-06` ✅
**1c. Booking core (non-instant-request)** — `BOOK-01, BOOK-03, BOOK-06, BOOK-07` ✅
**1d. Auth middleware & OTP** — `AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06 (+ IDEM-01 together), AUTH-07, AUTH-08` ✅
**1e. Frontend** — `FE-01, FE-02, FE-03, FE-04, FE-05, FE-06` ✅
**1f. Location + bonus** — `DATA-04` ✅, plus the `AdminService` half of `DATA-02` (geo-index removal on suspend) done opportunistically since it touches the same file

**Prerequisite check (done):** confirmed only one `AuthService` file exists in the codebase — `auth.routes.ts` imports and manually instantiates the same `modules/auth/services/AuthService.ts` the bug hunt read, so it's the live class on `/api/v1/auth` traffic. No duplicate to worry about.

Verification: `tsc --noEmit` clean on both `backend` and `frontend`; backend test suite 5/5 passing (added one new test covering the `BOOK-01` conflict-rejection path).

## Phase 2 — R1 Architecture Debt

### Phase R1a — ✅ DONE (30 Sep 2026): `instant-request.service.ts` + `instant-matching.service.ts` converted to OOP+DI
- Both services rewritten from static-method/raw-Prisma classes into proper constructor-injected classes implementing `IInstantRequestService`/`IInstantMatchingService`
- New `InstantRequestRepository` (extends the existing small cron-job repository of the same name) — ~25 methods covering every Prisma operation the two services need, all Prisma access now lives in the repository layer per AGENTS.md
- `ICacheService`/`CacheService` extended with `acquireLock`/`releaseLock` so the service no longer depends on the static `RedisService` utility for distributed locking
- `InstantRequestController` rewritten to extend `BaseController` (was static, manual try/catch + inline `res.json`) — now uses `this.validate()`/`this.ok()`/`this.created()` and lets `globalErrorHandler` handle typed exceptions, so error responses now correctly return their exception's real status code (404/403/409/etc.) instead of the previous hardcoded 400 for everything
- Routes converted to a `createInstantRequestRouter(controller)` factory using the DI `authenticate`/`authorize` middleware (was the legacy `authMiddleware`/`roleMiddleware`)
- Wired into `wireModules()` in `app.bootstrap.ts`; removed from the legacy static mount in `app.ts`, now routed via `(global as any).deps.instantRequestRouter` like every other DI module (full removal of that pattern is Phase R1c below)
- **Fixed as part of this same conversion** (per the original plan's own scoping): the hardcoded `rating: 4.8` / `totalJobs: 12` mock data in `submitBid()`'s socket emit — now uses the worker's real `rating`/`totalJobs`
- **Bug caught during the rewrite and fixed on the spot**: my first draft of `getMyRequests()` accidentally substituted a WorkerProfile lookup for what must be a ProviderProfile-existence check (this endpoint is used on the Provider's "my requests" page) — caught before committing, added a `findProviderProfileByUserId` repository method and a test (`"throws NotFoundException when the caller has no ProviderProfile"`) to lock in the correct behavior
- Added `InstantRequestService.test.ts` (6 tests) covering `getMyRequests`, `submitBid` (including the real-rating-data assertion), and `acceptRequest`
- **Deliberately NOT fixed here** (preserved exactly as before, on purpose): `BOOK-02` (per-item not per-worker lock), `BOOK-04` (booking creation bypasses `BookingStateService.transition()`), `BOOK-05` (plaintext work-start OTP), `RADIUS-01` (hardcoded radius tiers / 15s per-stage wait / force-EXPIRED) — these are the Phase 3 follow-ups now that the file is OOP and unit-testable
- **New finding, not yet actioned**: `shared/jobs/expire-instant-requests.job.ts` is a *second*, independent cron-based mechanism that also force-expires stale `OPEN` instant requests every minute — this directly overlaps with (and, like `InstantMatchingService`'s own end-of-stages expiry, contradicts) the "no timeout, manual cancel only" design `RADIUS-01` is meant to fix. When `RADIUS-01` is tackled, this cron job needs to be reconciled/removed in the same pass, not just the in-service expiry logic.

Verification: `tsc --noEmit` clean on both `backend` and `frontend`; backend test suite 11/11 passing (5 pre-existing + 6 new).

### Phase R1b/R1c — pending
Migrate remaining legacy route modules (`location`, `providers`, `skills`, `dashboard`, `pricing`, `auth.routes.ts`) onto the DI stack one at a time, then remove `(global as any).deps` entirely in favor of `app.locals` (or a real container) in one dedicated pass across the whole app. Also: fix the `OtpEmail` template import-path mismatch (R1.6). The two-`AuthService`-variants item (R1.5) turned out to be a non-issue — verified earlier this session that only one `AuthService` file exists.

## Phase 3 — Bugs unblocked by Phase 2
Now that `instant-request.service.ts`/`instant-matching.service.ts` are OOP and mockable, fix (each as its own PR with a new unit test):
`BOOK-02, BOOK-04, BOOK-05, RADIUS-01`, and the `instant-matching.service.ts` half of `DATA-02`.

## Phase 4 — Remaining Round-2 correctness items
`NOTIF-01` (make Admin email templates actually take effect), Google OAuth real implementation, Socket.IO namespacing.

## Phase 5 — Missing modules & DevOps completeness
Chat module (backend + Socket.IO + frontend), Category model, Support module, Analytics/Reports, dedicated Files module, Platform Settings routes, Agent module internals, CI/CD pipeline, Swagger/OpenAPI, `PricingRule` schema normalization, frontend `(public)` legal pages, `useAuth`/`usePermission` hooks.

## Phase 6 — Hardening
Full rate-limit audit, load testing (instant-request broadcast + accept race conditions specifically), monitoring/observability, final security review pass.

---

# Part D — What I'll need from you, as it comes up

Nothing is needed to *write* any of the Phase 1 fixes — they're all logic corrections against the existing codebase. Keys become relevant only for **end-to-end verification** of specific fixes:

- **Razorpay test-mode Key ID + Key Secret + Webhook Secret** — to verify `PAY-01`/`PAY-04` against real webhook deliveries (Razorpay's dashboard has a webhook test-send tool, or I can use a local tunnel). Backend `.env` may already have these — I'll check what's there first and only ask if it's missing/production-only.
- **Exotel / Resend credentials** — already present in `backend/.env`; will flag only if they turn out to be invalid/expired when we get to testing OTP delivery end-to-end.
- **Google Maps API key** — already present and confirmed working after this session's fix; no action needed.

I'll call it out explicitly at the start of whichever phase first needs live verification, rather than asking upfront for things we may not need.

---

**Status: Phase 0 and Phase 1 are done (30 Sep 2026).** Next up is Phase R1 (architecture debt), pending your go-ahead.
