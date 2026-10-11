import { describe, it, expect, vi, beforeEach } from "vitest";

const redisMock = {
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
};

vi.mock("../../config/redis.js", () => ({ redis: redisMock }));

const { idempotencyMiddleware } = await import("../idempotency.middleware.js");

function makeReqResNext(overrides: Partial<{ method: string; path: string; key: string | undefined }> = {}) {
  const req: any = {
    method: overrides.method ?? "POST",
    path: overrides.path ?? "/api/v1/auth/login",
    headers: overrides.key !== undefined ? { "idempotency-key": overrides.key } : {},
  };
  const res: any = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json: vi.fn(),
  };
  const next = vi.fn();
  return { req, res, next };
}

describe("idempotencyMiddleware", () => {
  beforeEach(() => {
    redisMock.set.mockReset();
    redisMock.get.mockReset();
    redisMock.del.mockReset();
    redisMock.del.mockResolvedValue(1);
  });

  it("passes through untouched when no Idempotency-Key header is present", async () => {
    const { req, res, next } = makeReqResNext({ key: undefined });
    await idempotencyMiddleware()(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(redisMock.set).not.toHaveBeenCalled();
  });

  it("scopes the Redis key by method+path, not just the raw header value", async () => {
    redisMock.set.mockResolvedValue("OK");
    const { req, res, next } = makeReqResNext({ method: "POST", path: "/api/v1/auth/verify-otp", key: "abc-123" });

    await idempotencyMiddleware()(req, res, next);

    expect(redisMock.set).toHaveBeenCalledWith(
      "idempotency:POST:/api/v1/auth/verify-otp:abc-123",
      expect.any(String),
      "EX",
      expect.any(Number),
      "NX",
    );
    expect(next).toHaveBeenCalled();
  });

  it("caches a 2xx response so a retry with the same key replays it", async () => {
    redisMock.set.mockResolvedValue("OK");
    const { req, res, next } = makeReqResNext({ key: "abc-123" });

    await idempotencyMiddleware()(req, res, next);
    res.statusCode = 200;
    res.json({ success: true });

    const cacheCall = redisMock.set.mock.calls.find((c) => c[0].includes("abc-123") && c[2] === "EX" && c.length === 4);
    expect(cacheCall).toBeTruthy();
    expect(JSON.parse(cacheCall![1])).toEqual({ status: 200, body: { success: true } });
  });

  it("releases the claim instead of caching a non-2xx response, so a corrected retry can actually re-run", async () => {
    redisMock.set.mockResolvedValue("OK");
    const { req, res, next } = makeReqResNext({ key: "abc-123" });

    await idempotencyMiddleware()(req, res, next);
    res.statusCode = 400;
    res.json({ success: false, message: "OTP_INVALID" });

    expect(redisMock.del).toHaveBeenCalledWith("idempotency:POST:/api/v1/auth/login:abc-123");
    // Must NOT have cached the error body under the 4-arg "EX ttl" success-cache call.
    const errorCached = redisMock.set.mock.calls.some(
      (c) => c.length === 4 && JSON.parse(c[1]).status === 400,
    );
    expect(errorCached).toBe(false);
  });

  it("replays a cached success response without calling next() again", async () => {
    redisMock.set.mockResolvedValue(null); // claim lost — another request already completed
    redisMock.get.mockResolvedValue(JSON.stringify({ status: 200, body: { success: true, cached: true } }));
    const { req, res, next } = makeReqResNext({ key: "abc-123" });

    await idempotencyMiddleware()(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ success: true, cached: true });
    expect(res.statusCode).toBe(200);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 409 for a request still in-flight under the same key", async () => {
    redisMock.set.mockResolvedValue(null);
    redisMock.get.mockResolvedValue(JSON.stringify({ status: "PROCESSING" }));
    const { req, res, next } = makeReqResNext({ key: "abc-123" });

    await idempotencyMiddleware()(req, res, next);

    expect(res.statusCode).toBe(409);
    expect(next).not.toHaveBeenCalled();
  });
});
