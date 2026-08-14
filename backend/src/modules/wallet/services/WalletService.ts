import { BaseService } from '../../../core/base/BaseService.js';
import type { IWalletService } from '../interfaces/IWalletService.js';
import type { IWalletRepository } from '../interfaces/IWalletRepository.js';
import type { ITransactionRepository } from '../interfaces/ITransactionRepository.js';
import type { IWorkerRepository } from '../../workers/interfaces/IWorkerRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { NotFoundException, BusinessException } from '../../../core/exceptions/index.js';

export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export class WalletService extends BaseService implements IWalletService {
  constructor(
    private readonly walletRepo: IWalletRepository,
    private readonly transactionRepo: ITransactionRepository,
    private readonly workerRepo: IWorkerRepository,
    private readonly prisma: PrismaService,
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
    this.log('Crediting worker wallet', { workerId, amount, purpose, referenceId });

    await this.prisma.transaction(async (tx) => {
      let wallet = await this.walletRepo.findByWorkerId(workerId, tx);
      if (!wallet) {
        wallet = await this.walletRepo.create(workerId, tx);
      }

      const newBalance = Number(wallet.balance) + amount;
      await this.walletRepo.updateBalance(wallet.id, newBalance, tx);

      await this.transactionRepo.create({
        walletId: wallet.id,
        amount,
        type: TransactionType.CREDIT,
        reference: `${purpose}:${referenceId || 'SYSTEM'}`,
      }, tx);
    });
  }

  async debitWallet(workerId: string, amount: number, purpose: string, referenceId?: string): Promise<void> {
    this.log('Debiting worker wallet', { workerId, amount, purpose, referenceId });

    await this.prisma.transaction(async (tx) => {
      let wallet = await this.walletRepo.findByWorkerId(workerId, tx);
      if (!wallet) {
        wallet = await this.walletRepo.create(workerId, tx);
      }

      const balance = Number(wallet.balance);
      if (balance < amount) {
        throw new BusinessException('INSUFFICIENT_WALLET_BALANCE', 'Insufficient wallet balance for this transaction.');
      }

      const newBalance = balance - amount;
      await this.walletRepo.updateBalance(wallet.id, newBalance, tx);

      await this.transactionRepo.create({
        walletId: wallet.id,
        amount,
        type: TransactionType.DEBIT,
        reference: `${purpose}:${referenceId || 'SYSTEM'}`,
      }, tx);
    });
  }
}
