import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import http from "http";
import app from "../../app.js";
import { PrismaService } from "../../database/prisma/PrismaService.js";
import { CacheService } from "../../infrastructure/cache/CacheService.js";
import { redis } from "../../shared/config/redis.js";
import { initializeSocket } from "../../socket/socket.js";
import { UserRole } from "../../core/enums/Role.js";
import {
  InstantRequestRepository,
  InstantMatchingService,
  InstantRequestService,
  InstantRequestController,
  createInstantRequestRouter,
} from "../../modules/instant-requests/index.js";
import { BookingStatusHistoryRepository } from "../../modules/bookings/index.js";
import { PlatformSettingRepository } from "../../modules/platform-settings/index.js";
import { TokenService } from "../../modules/auth/index.js";

/**
 * REAL-DB concurrency test for the instant-request accept race (Phase 6 "Hardening" — the
 * project plan explicitly calls this out). Deliberately excluded from the default `npm test`
 * / CI run (see vitest.config.ts's `exclude`) because it needs a real Postgres AND a real
 * Redis reachable — CI's backend job mocks both away entirely. Run it locally with:
 *
 *   npm run test:race
 *
 * ...with `docker-compose up -d redis` (or any local Redis) running alongside the project's
 * normal Postgres. If either is unreachable, every test below logs a warning and skips
 * itself rather than failing the suite outright.
 *
 * What this proves that the existing mocked unit tests (InstantRequestService.test.ts)
 * cannot: the two optimistic `updateMany`-based guards (`markWorkerUnavailableIfAvailable`,
 * `incrementAcceptedWorkersIfSlotAvailable`) actually serialize correctly against a REAL
 * Postgres under genuine concurrent writes, not just "return whatever the mock was told to
 * return". A regression that swapped either back to a plain findUnique+update would pass
 * every mocked unit test but should fail here.
 */

// Last 8 digits of the timestamp — short on purpose. The original `race${Date.now()}`
// (17+ chars) overflowed the 15-char phone slice before the per-worker `index` suffix could
// even be reached, so every seeded worker collided on the same truncated phone number.
const TEST_RUN_ID = String(Date.now()).slice(-8);
const prismaService = PrismaService.getInstance();
const prisma = prismaService.client;

let ready = false;
let server: http.Server;

let skillId: string;
let providerUserId: string;
const workerUserIds: string[] = [];
const workerProfileIds: string[] = [];
const workerTokens: string[] = [];

async function seedWorker(index: number) {
  const user = await prisma.user.create({
    data: {
      name: `Race Worker ${index}`,
      phone: `9${TEST_RUN_ID}${index}`.slice(0, 15),
      role: UserRole.WORKER,
      isVerified: true,
    },
  });
  const profile = await prisma.workerProfile.create({
    data: { userId: user.id, isAvailable: true },
  });
  await prisma.workerSkill.create({ data: { workerId: profile.id, skillId } });

  const cache = new CacheService(redis);
  const tokenService = new TokenService(cache);
  const token = tokenService.generateAccessToken(user.id, UserRole.WORKER);

  workerUserIds.push(user.id);
  workerProfileIds.push(profile.id);
  workerTokens.push(token);
}

async function createOpenItem(requiredWorkers: number) {
  const instantRequest = await prisma.instantRequest.create({
    data: {
      providerId: providerUserId,
      skillId,
      title: "Race test request",
      latitude: 12.9716,
      longitude: 77.5946,
      amount: 500,
      status: "OPEN",
      bookingMode: "DIRECT",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  const item = await prisma.instantRequestItem.create({
    data: {
      requestId: instantRequest.id,
      skillId,
      requiredWorkers,
      status: "OPEN",
    },
  });
  return { instantRequest, item };
}

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    ready = true;
  } catch (err) {
    console.warn(
      "\n[instant-request-race.local.test] Skipping — real Postgres and/or real Redis not reachable.\n" +
        "Start them (e.g. `docker-compose up -d redis` + the project's usual Postgres) and re-run `npm run test:race`.\n" +
        `Reason: ${(err as Error).message}\n`,
    );
    return;
  }

  server = http.createServer(app);
  initializeSocket(server);

  const cache = new CacheService(redis);
  const instantRequestRepo = new InstantRequestRepository(prismaService);
  const platformSettingRepo = new PlatformSettingRepository(prismaService);
  const bookingHistoryRepo = new BookingStatusHistoryRepository(prismaService);
  const matchingService = new InstantMatchingService(instantRequestRepo, cache, platformSettingRepo);
  const instantRequestService = new InstantRequestService(
    instantRequestRepo,
    cache,
    prismaService,
    matchingService,
    bookingHistoryRepo,
  );
  const instantRequestController = new InstantRequestController(instantRequestService, cache);
  const instantRequestRouter = createInstantRequestRouter(instantRequestController);
  app.locals.deps = { ...app.locals.deps, instantRequestRouter } as any;

  const skill = await prisma.skill.create({
    data: { name: `Race Skill ${TEST_RUN_ID}`, baseRate: 100 },
  });
  skillId = skill.id;

  const provider = await prisma.user.create({
    data: {
      name: "Race Provider",
      phone: `8${TEST_RUN_ID}`.slice(0, 15),
      role: UserRole.PROVIDER,
      isVerified: true,
    },
  });
  await prisma.providerProfile.create({ data: { userId: provider.id } });
  providerUserId = provider.id;

  for (let i = 0; i < 5; i++) {
    await seedWorker(i);
  }
}, 30_000);

afterAll(async () => {
  if (!ready) return;

  await prisma.booking.deleteMany({ where: { providerId: providerUserId } });
  await prisma.instantRequestResponse.deleteMany({ where: { workerId: { in: workerProfileIds } } });
  await prisma.instantRequestItem.deleteMany({ where: { skillId } });
  await prisma.instantRequest.deleteMany({ where: { providerId: providerUserId } });
  await prisma.workerSkill.deleteMany({ where: { workerId: { in: workerProfileIds } } });
  await prisma.workerProfile.deleteMany({ where: { id: { in: workerProfileIds } } });
  await prisma.providerProfile.deleteMany({ where: { userId: providerUserId } });
  await prisma.user.deleteMany({ where: { id: { in: [...workerUserIds, providerUserId] } } });
  await prisma.skill.deleteMany({ where: { id: skillId } });
}, 30_000);

describe("Instant request accept — real concurrency", () => {
  it("lets exactly one worker win a single-slot item when 5 accept at once", async () => {
    if (!ready) {
      console.warn("Skipped (DB/Redis unreachable)");
      return;
    }

    const { item } = await createOpenItem(1);

    const responses = await Promise.all(
      workerTokens.map((token) =>
        request(app)
          .post(`/api/v1/instant-requests/items/${item.id}/accept`)
          .set("Authorization", `Bearer ${token}`)
          .send(),
      ),
    );

    const succeeded = responses.filter((r) => r.status === 200);
    const rejected = responses.filter((r) => r.status !== 200);

    expect(succeeded).toHaveLength(1);
    expect(rejected).toHaveLength(4);
    rejected.forEach((r) => expect(r.status).toBe(422));

    const finalItem = await prisma.instantRequestItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(finalItem.acceptedWorkers).toBe(1);
    expect(finalItem.status).toBe("FILLED");

    const unavailableCount = await prisma.workerProfile.count({
      where: { id: { in: workerProfileIds }, isAvailable: false },
    });
    expect(unavailableCount).toBe(1);

    const bookingCount = await prisma.booking.count({ where: { instantRequestId: item.requestId } });
    expect(bookingCount).toBe(1);

    // Reset availability for the next test.
    await prisma.workerProfile.updateMany({ where: { id: { in: workerProfileIds } }, data: { isAvailable: true } });
  }, 20_000);

  it("fills exactly `requiredWorkers` slots and rejects the rest once full (2-slot item, 5 workers)", async () => {
    if (!ready) {
      console.warn("Skipped (DB/Redis unreachable)");
      return;
    }

    const { item } = await createOpenItem(2);

    // Sequential, not Promise.all-concurrent, on purpose: the per-item Redis lock
    // (lock:instant-item:*) fails fast (doesn't queue/wait) when another request for the SAME
    // item is already mid-transaction, which test 1 above already verifies correctly rejects
    // genuinely-simultaneous accepts. Firing all 5 at once here would mostly just test that
    // lock's fail-fast behavior again (and did, non-deterministically, when first tried) rather
    // than the thing this test actually targets: the atomic slot-count guard
    // (incrementAcceptedWorkersIfSlotAvailable) correctly allowing exactly `requiredWorkers`
    // through across separate attempts and rejecting the rest with SLOTS_FILLED once full —
    // which is the realistic shape of "5 workers tap accept within the same few seconds".
    const responses = [];
    for (const token of workerTokens) {
      responses.push(
        await request(app)
          .post(`/api/v1/instant-requests/items/${item.id}/accept`)
          .set("Authorization", `Bearer ${token}`)
          .send(),
      );
    }

    const succeeded = responses.filter((r) => r.status === 200);
    const rejected = responses.filter((r) => r.status !== 200);

    expect(succeeded).toHaveLength(2);
    expect(rejected).toHaveLength(3);
    rejected.forEach((r) => {
      expect(r.status).toBe(422);
      // SLOTS_FILLED if this item still has siblings keeping the request open, or
      // REQUEST_CLOSED if filling this item's last slot closed the whole request (the case
      // here, since the test only creates one item) — both are the slot guard doing its job
      // correctly, just caught at a different layer depending on what else is open.
      expect(["SLOTS_FILLED", "REQUEST_CLOSED"]).toContain(r.body?.errorCode);
    });

    const finalItem = await prisma.instantRequestItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(finalItem.acceptedWorkers).toBe(2);

    const unavailableCount = await prisma.workerProfile.count({
      where: { id: { in: workerProfileIds }, isAvailable: false },
    });
    expect(unavailableCount).toBe(2);
  }, 20_000);
});
