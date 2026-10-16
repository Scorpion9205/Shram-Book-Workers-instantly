import { BaseService } from '../../../core/base/BaseService.js';
import type { IWalletService } from '../interfaces/IWalletService.js';
import type { IWalletRepository } from '../interfaces/IWalletRepository.js';
import type { ITransactionRepository } from '../interfaces/ITransactionRepository.js';
import type { IWorkerRepository } from '../../workers/interfaces/IWorkerRepository.js';
import { NotFoundException } from '../../../core/exceptions/index.js';

export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

/**
 * Worker wallet logic: balance lookups, transaction history, and the credit/debit calls
 * that the payment consumer makes when a booking is settled.
 *
 * Only self-managed workers have a wallet. Agent-managed bookings never touch it - those
 * are paid out manually by the agent (see AgentService.payoutWorker).
 */
export class WalletService extends BaseService implements IWalletService {
  constructor(
    private readonly walletRepo: IWalletRepository,
    private readonly transactionRepo: ITransactionRepository,
    private readonly workerRepo: IWorkerRepository,
  ) {
    super('WalletService');
  }

  // The wallet hangs off WorkerProfile, not User, so every call first maps userId -> worker.
  private async getWorkerProfile(userId: string): Promise<any> {
    const worker = await this.workerRepo.findByUserId(userId);
    if (!worker) {
      throw new NotFoundException('WorkerProfile', userId);
    }
    return worker;
  }

  async getWalletBalance(userId: string): Promise<any> {
    this.log('Fetching wallet balance for worker user', { userId });
    const worker = await this.getWorkerProfile(userId);

    // Wallets are created lazily, so a worker who has never earned anything has no row yet.
    // Create it on first look instead of showing an error.
    let wallet = await this.walletRepo.findByWorkerId(worker.id);
    if (!wallet) {
      wallet = await this.walletRepo.create(worker.id);
    }

    // Prisma returns Decimal; the API only needs a plain number.
    return { balance: Number(wallet.balance) };
  }

  async getTransactionHistory(userId: string): Promise<any[]> {
    this.log('Fetching transaction history for worker user', { userId });
    const worker = await this.getWorkerProfile(userId);

    // No wallet means no transactions yet - an empty list is the right answer here.
    let wallet = await this.walletRepo.findByWorkerId(worker.id);
    if (!wallet) {
      return [];
    }

    return this.transactionRepo.findManyByWalletId(wallet.id);
  }

  // Adds money to the wallet and writes the ledger row in one DB transaction.
  // `purpose` + `referenceId` make a unique key, so replaying the same event can't double-credit.
  async creditWallet(workerId: string, amount: number, purpose: string, referenceId?: string): Promise<void> {
    this.log('Crediting worker wallet atomically', { workerId, amount, purpose, referenceId });
    await this.walletRepo.creditWithTransaction(workerId, amount, purpose, referenceId);
  }

  // Same idea as creditWallet but takes money out. By default it refuses to go below zero;
  // pass allowNegative for things like commission that must be recorded even if the balance is short.
  async debitWallet(workerId: string, amount: number, purpose: string, referenceId?: string, allowNegative: boolean = false): Promise<void> {
    this.log('Debiting worker wallet atomically', { workerId, amount, purpose, referenceId, allowNegative });
    await this.walletRepo.debitWithTransaction(workerId, amount, purpose, referenceId, allowNegative);
  }
}
