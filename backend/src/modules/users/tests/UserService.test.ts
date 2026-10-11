import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserService } from "../services/UserService.js";
import { NotFoundException } from "../../../core/exceptions/index.js";

describe("UserService.deleteAccount", () => {
  let userRepoMock: any;
  let cacheMock: any;
  let service: UserService;

  beforeEach(() => {
    userRepoMock = {
      findById: vi.fn().mockResolvedValue({ id: "user_1", isActive: true }),
      update: vi.fn().mockResolvedValue({ id: "user_1", isActive: false }),
    };
    cacheMock = { del: vi.fn(), set: vi.fn() };
    service = new UserService(userRepoMock, cacheMock, {} as any);
  });

  it("sets deletedAt (not just isActive) so re-signup with the same email/phone isn't permanently blocked", async () => {
    await service.deleteAccount("user_1");

    expect(userRepoMock.update).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ isActive: false, deletedAt: expect.any(Date) }),
    );
  });

  it("sets a revocation marker so an already-issued access token stops working immediately", async () => {
    await service.deleteAccount("user_1");

    expect(cacheMock.set).toHaveBeenCalledWith("auth:revoked:user_1", true, expect.any(Number));
  });

  it("404s for a user that doesn't exist or is already deleted", async () => {
    userRepoMock.findById.mockResolvedValue(null);

    await expect(service.deleteAccount("user_1")).rejects.toThrow(NotFoundException);
  });
});
