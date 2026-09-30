import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";
import app from "../../app.js";
import { PrismaService } from "../../database/prisma/PrismaService.js";
import { CacheService } from "../../infrastructure/cache/CacheService.js";
import {
  AuthRepository,
  OTPRepository,
  AuthService,
  OTPService,
  TokenService,
  AuthController,
  createAuthRouter,
} from "../../modules/auth/index.js";
import { ResendProvider } from "../../infrastructure/providers/email/ResendProvider.js";
import { ExotelProvider } from "../../infrastructure/providers/sms/ExotelProvider.js";

// Mock prisma database and redis
vi.mock("../../shared/config/prisma.js", () => {
  return {
    default: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      otp: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

vi.mock("../../shared/config/redis.js", () => {
  return {
    redis: {
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(true),
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
      ttl: vi.fn().mockResolvedValue(100),
      ping: vi.fn().mockResolvedValue("PONG"),
    },
  };
});

beforeAll(async () => {
  // The auth router is now wired through the DI bootstrap (app.locals.deps), populated
  // asynchronously by wireModules() in server.ts — which this test doesn't run. Build the
  // minimal real dependency chain against the already-mocked prisma/redis modules above,
  // matching what server.ts does, so the app's DI-mount middleware finds a real router.
  const { redis } = await import("../../shared/config/redis.js");
  const prismaService = PrismaService.getInstance();
  const cache = new CacheService(redis as any);
  const authRepo = new AuthRepository(prismaService);
  const otpRepo = new OTPRepository(prismaService);
  const emailProvider = new ResendProvider(undefined, "noreply@shram.in");
  const smsProvider = new ExotelProvider(undefined, undefined, undefined, undefined);
  const otpService = new OTPService(otpRepo, cache, emailProvider, smsProvider);
  const tokenService = new TokenService(cache);
  const authService = new AuthService(authRepo, otpService, tokenService, cache, prismaService, emailProvider, smsProvider);
  const authController = new AuthController(authService, cache);
  const authRouter = createAuthRouter(authController);

  app.locals.deps = { authRouter } as any;
});

describe("Auth Integration Tests", () => {
  it("should fail signup if request payload fails schema validation", async () => {
    const res = await request(app)
      .post("/api/v1/auth/signup")
      .send({
        name: "Test User",
        // missing required fields: phone, role
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
