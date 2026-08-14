import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../../app.js";

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
