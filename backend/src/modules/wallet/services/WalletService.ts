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

export class WalletService extends BaseService implements IWalletService {
  constructor(
    private readonly walletRepo: IWalletRepository,
    private readonly transactionRepo: ITransactionRepository,
    private readonly workerRepo: IWorkerRepository,
  ) {
    super('WalletService');
  }

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

    let wallet = await this.walletRepo.findByWorkerId(worker.id);
    if (!wallet) {
      wallet = await this.walletRepo.create(worker.id);
    }

    return { balance: Number(wallet.balance) };
  }

  async getTransactionHistory(userId: string): Promise<any[]> {
    this.log('Fetching transaction history for worker user', { userId });
    const worker = await this.getWorkerProfile(userId);

    let wallet = await this.walletRepo.findByWorkerId(worker.id);
    if (!wallet) {
      return [];
    }

    return this.transactionRepo.findManyByWalletId(wallet.id);
  }

  async creditWallet(workerId: string, amount: number, purpose: string, referenceId?: string): Promise<void> {
    this.log('Crediting worker wallet atomically', { workerId, amount, purpose, referenceId });
    await this.walletRepo.creditWithTransaction(workerId, amount, purpose, referenceId);
  }

  async debitWallet(workerId: string, amount: number, purpose: string, referenceId?: string, allowNegative: boolean = false): Promise<void> {
    this.log('Debiting worker wallet atomically', { workerId, amount, purpose, referenceId, allowNegative });
    await this.walletRepo.debitWithTransaction(workerId, amount, purpose, referenceId, allowNegative);
  }
}
