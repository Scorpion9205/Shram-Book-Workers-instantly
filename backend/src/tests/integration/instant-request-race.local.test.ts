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

const TEST_RUN_ID = `race${Date.now()}`;
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

  it("fills exactly `requiredWorkers` slots and rejects the rest when 5 accept a 2-slot item at once", async () => {
    if (!ready) {
      console.warn("Skipped (DB/Redis unreachable)");
      return;
    }

    const { item } = await createOpenItem(2);

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

    expect(succeeded).toHaveLength(2);
    expect(rejected).toHaveLength(3);

    const finalItem = await prisma.instantRequestItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(finalItem.acceptedWorkers).toBe(2);

    const unavailableCount = await prisma.workerProfile.count({
      where: { id: { in: workerProfileIds }, isAvailable: false },
    });
    expect(unavailableCount).toBe(2);
  }, 20_000);
});
