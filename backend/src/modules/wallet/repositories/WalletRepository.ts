import type { Wallet, Prisma } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type { IWalletRepository } from '../interfaces/IWalletRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { BusinessException } from '../../../core/exceptions/index.js';

export class WalletRepository extends BaseRepository<Wallet> implements IWalletRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByWorkerId(workerId: string, tx?: Prisma.TransactionClient): Promise<Wallet | null> {
    const client = tx || this.prisma.client;
    return client.wallet.findUnique({
      where: { workerId },
    });
  }

  async create(workerId: string, tx?: Prisma.TransactionClient): Promise<Wallet> {
    const client = tx || this.prisma.client;
    return client.wallet.create({
      data: {
        workerId,
        balance: 0,
      },
    });
  }

  async updateBalance(id: string, balance: number, tx?: Prisma.TransactionClient): Promise<Wallet> {
    const client = tx || this.prisma.client;
    return client.wallet.update({
      where: { id },
      data: { balance },
    });
  }

  async incrementBalance(id: string, amount: number, tx?: Prisma.TransactionClient): Promise<Wallet> {
    const client = tx || this.prisma.client;
    return client.wallet.update({
      where: { id },
      data: {
        balance: { increment: amount },
      },
    });
  }

  async decrementBalance(id: string, amount: number, allowNegative: boolean = false, tx?: Prisma.TransactionClient): Promise<Wallet> {
    const client = tx || this.prisma.client;
    if (!allowNegative) {
      const result = await client.wallet.updateMany({
        where: {
          id,
          balance: { gte: amount },
        },
        data: {
          balance: { decrement: amount },
        },
      });

      if (result.count === 0) {
        throw new BusinessException('INSUFFICIENT_WALLET_BALANCE', 'Insufficient wallet balance for this transaction.');
      }

      return (await client.wallet.findUnique({ where: { id } }))!;
    }

    return client.wallet.update({
      where: { id },
      data: {
        balance: { decrement: amount },
      },
    });
  }

  async creditWithTransaction(workerId: string, amount: number, purpose: string, referenceId?: string): Promise<void> {
    await this.prisma.transaction(async (tx) => {
      let wallet = await this.findByWorkerId(workerId, tx);
      if (!wallet) {
        wallet = await this.create(workerId, tx);
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount },
        },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: 'CREDIT',
          reference: `${purpose}:${referenceId || 'SYSTEM'}`,
        },
      });
    });
  }

  async debitWithTransaction(workerId: string, amount: number, purpose: string, referenceId?: string, allowNegative: boolean = false): Promise<void> {
    await this.prisma.transaction(async (tx) => {
      let wallet = await this.findByWorkerId(workerId, tx);
      if (!wallet) {
        wallet = await this.create(workerId, tx);
      }

      if (!allowNegative) {
        const result = await tx.wallet.updateMany({
          where: {
            id: wallet.id,
            balance: { gte: amount },
          },
          data: {
            balance: { decrement: amount },
          },
        });

        if (result.count === 0) {
          throw new BusinessException('INSUFFICIENT_WALLET_BALANCE', 'Insufficient wallet balance for this transaction.');
        }
      } else {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: { decrement: amount },
          },
        });
      }

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: 'DEBIT',
          reference: `${purpose}:${referenceId || 'SYSTEM'}`,
        },
      });
    });
  }
}
