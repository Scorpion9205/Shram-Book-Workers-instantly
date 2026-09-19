import { describe, it, expect, vi, beforeEach } from "vitest";
import { WalletService } from "../services/WalletService.js";
import { NotFoundException } from "../../../core/exceptions/index.js";

describe("WalletService", () => {
  let walletRepoMock: any;
  let transactionRepoMock: any;
  let workerRepoMock: any;
  let service: WalletService;

  beforeEach(() => {
    walletRepoMock = {
      findByWorkerId: vi.fn(),
      create: vi.fn(),
      creditWithTransaction: vi.fn().mockResolvedValue(undefined),
      debitWithTransaction: vi.fn().mockResolvedValue(undefined),
    };
    transactionRepoMock = {
      findManyByWalletId: vi.fn(),
    };
    workerRepoMock = {
      findByUserId: vi.fn(),
    };

    service = new WalletService(
      walletRepoMock,
      transactionRepoMock,
      workerRepoMock
    );
  });

  it("should return existing wallet balance for a worker", async () => {
    workerRepoMock.findByUserId.mockResolvedValue({ id: "worker_123", userId: "user_123" });
    walletRepoMock.findByWorkerId.mockResolvedValue({ id: "wallet_123", balance: 1500 });

    const result = await service.getWalletBalance("user_123");

    expect(result).toEqual({ balance: 1500 });
    expect(workerRepoMock.findByUserId).toHaveBeenCalledWith("user_123");
    expect(walletRepoMock.findByWorkerId).toHaveBeenCalledWith("worker_123");
  });

  it("should auto-create a wallet if one does not exist and return 0 balance", async () => {
    workerRepoMock.findByUserId.mockResolvedValue({ id: "worker_123", userId: "user_123" });
    walletRepoMock.findByWorkerId.mockResolvedValue(null);
    walletRepoMock.create.mockResolvedValue({ id: "wallet_new", balance: 0 });

    const result = await service.getWalletBalance("user_123");

    expect(result).toEqual({ balance: 0 });
    expect(walletRepoMock.create).toHaveBeenCalledWith("worker_123");
  });

  it("should throw NotFoundException if worker profile does not exist", async () => {
    workerRepoMock.findByUserId.mockResolvedValue(null);

    await expect(service.getWalletBalance("non_existent")).rejects.toThrow(NotFoundException);
  });

  it("should delegate creditWallet atomically to repository creditWithTransaction", async () => {
    await service.creditWallet("worker_123", 500, "JOB_PAYOUT", "job_999");

    expect(walletRepoMock.creditWithTransaction).toHaveBeenCalledWith(
      "worker_123",
      500,
      "JOB_PAYOUT",
      "job_999"
    );
  });

  it("should delegate debitWallet atomically to repository debitWithTransaction", async () => {
    await service.debitWallet("worker_123", 200, "WITHDRAWAL", "ref_111", false);

    expect(walletRepoMock.debitWithTransaction).toHaveBeenCalledWith(
      "worker_123",
      200,
      "WITHDRAWAL",
      "ref_111",
      false
    );
  });
});
