import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { WalletRepository } from "../repositories/WalletRepository.js";
import { BusinessException } from "../../../core/exceptions/index.js";

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed on the fields: (`reference`)", {
    code: "P2002",
    clientVersion: "7.8.0",
  });
}

describe("WalletRepository — redelivery idempotency", () => {
  let prismaServiceMock: any;
  let repo: WalletRepository;

  beforeEach(() => {
    prismaServiceMock = { transaction: vi.fn() };
    repo = new WalletRepository(prismaServiceMock);
  });

  describe("creditWithTransaction", () => {
    it("silently skips (does not throw) when the reference was already processed", async () => {
      prismaServiceMock.transaction.mockRejectedValue(uniqueConstraintError());

      await expect(
        repo.creditWithTransaction("worker_1", 450, "BOOKING_PAYMENT", "booking_1"),
      ).resolves.toBeUndefined();
    });

    it("propagates any other error unchanged", async () => {
      prismaServiceMock.transaction.mockRejectedValue(new Error("DB connection lost"));

      await expect(
        repo.creditWithTransaction("worker_1", 450, "BOOKING_PAYMENT", "booking_1"),
      ).rejects.toThrow("DB connection lost");
    });

    it("resolves normally on first-time success", async () => {
      prismaServiceMock.transaction.mockResolvedValue(undefined);

      await expect(
        repo.creditWithTransaction("worker_1", 450, "BOOKING_PAYMENT", "booking_1"),
      ).resolves.toBeUndefined();
      expect(prismaServiceMock.transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe("debitWithTransaction", () => {
    it("silently skips (does not throw) when the reference was already processed", async () => {
      prismaServiceMock.transaction.mockRejectedValue(uniqueConstraintError());

      await expect(
        repo.debitWithTransaction("worker_1", 50, "COMMISSION_DEDUCTION", "booking_1", true),
      ).resolves.toBeUndefined();
    });

    it("still propagates a genuine insufficient-balance failure", async () => {
      prismaServiceMock.transaction.mockRejectedValue(
        new BusinessException("INSUFFICIENT_WALLET_BALANCE", "Insufficient wallet balance for this transaction."),
      );

      await expect(
        repo.debitWithTransaction("worker_1", 50, "COMMISSION_DEDUCTION", "booking_1", false),
      ).rejects.toThrow(BusinessException);
    });
  });
});
