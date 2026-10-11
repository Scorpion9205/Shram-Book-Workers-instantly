import { describe, it, expect, vi, beforeEach } from "vitest";

const redisMock = { get: vi.fn(), set: vi.fn(), del: vi.fn() };
vi.mock("../../../../shared/config/redis.js", () => ({ redis: redisMock }));

const verifyAccessTokenMock = vi.fn();
vi.mock("../../services/TokenService.js", () => ({
  TokenService: class {
    verifyAccessToken(...args: unknown[]) {
      return verifyAccessTokenMock(...args);
    }
  },
}));

const { authenticate } = await import("../authenticate.middleware.js");

function makeReqResNext(token?: string) {
  const req: any = { headers: token ? { authorization: `Bearer ${token}` } : {} };
  const res: any = {};
  const next = vi.fn();
  return { req, res, next };
}

describe("authenticate middleware", () => {
  beforeEach(() => {
    redisMock.get.mockReset();
    verifyAccessTokenMock.mockReset();
    verifyAccessTokenMock.mockReturnValue({ userId: "user_1", role: "WORKER" });
  });

  it("rejects when no Authorization header is present", async () => {
    const { req, res, next } = makeReqResNext();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(req.user).toBeUndefined();
  });

  it("populates req.user and calls next() for a valid, non-revoked token", async () => {
    redisMock.get.mockResolvedValue(null);
    const { req, res, next } = makeReqResNext("valid-token");

    await authenticate(req, res, next);

    expect(req.user).toEqual({ id: "user_1", userId: "user_1", role: "WORKER" });
    expect(next).toHaveBeenCalledWith(); // called with no error
  });

  it("rejects a structurally-valid token whose user was suspended/deleted after it was issued", async () => {
    redisMock.get.mockResolvedValue(JSON.stringify(true));
    const { req, res, next } = makeReqResNext("still-valid-but-revoked-token");

    await authenticate(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "ACCOUNT_REVOKED" }));
  });
});
