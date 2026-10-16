import { Prisma } from '@prisma/client';
import type { Wallet } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type { IWalletRepository } from '../interfaces/IWalletRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { BusinessException } from '../../../core/exceptions/index.js';
import { Logger } from '../../../core/logger/Logger.js';

const logger = new Logger('WalletRepository');

/**
 * All Prisma access for wallets. The *WithTransaction methods are the ones the app actually
 * uses for money movement: balance change + ledger row happen together or not at all.
 * Every method takes an optional `tx` so it can join a transaction the caller already opened.
 */
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
      // Check-and-subtract in a single UPDATE (balance >= amount). Doing a read first and then
      // an update would let two parallel debits both pass the check and overdraw the wallet.
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

  // Credit = bump the balance + insert a CREDIT ledger row, atomically.
  async creditWithTransaction(workerId: string, amount: number, purpose: string, referenceId?: string): Promise<void> {
    // e.g. "BOOKING_PAYMENT:<bookingId>" - unique per event, which is what makes retries safe.
    const reference = `${purpose}:${referenceId || 'SYSTEM'}`;
    try {
      await this.prisma.transaction(async (tx) => {
        // First-ever credit for this worker: create the wallet on the spot.
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
            reference,
          },
        });
      });
    } catch (err) {
      // reference is @unique — a redelivered queue message (consumer crashed/disconnected
      // after crediting but before acking) hits this instead of crediting the worker twice.
      // The whole $transaction (balance increment included) rolled back automatically.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        logger.warn(`Duplicate wallet credit skipped (already processed): ${reference}`);
        return;
      }
      throw err;
    }
  }

  // Debit = lower the balance + insert a DEBIT ledger row, atomically.
  async debitWithTransaction(workerId: string, amount: number, purpose: string, referenceId?: string, allowNegative: boolean = false): Promise<void> {
    const reference = `${purpose}:${referenceId || 'SYSTEM'}`;
    try {
      await this.prisma.transaction(async (tx) => {
        let wallet = await this.findByWorkerId(workerId, tx);
        if (!wallet) {
          wallet = await this.create(workerId, tx);
        }

        if (!allowNegative) {
          // Same guarded UPDATE as decrementBalance: refuses to overdraw even under parallel requests.
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
            reference,
          },
        });
      });
    } catch (err) {
      // See creditWithTransaction — same redelivery-safety rationale.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        logger.warn(`Duplicate wallet debit skipped (already processed): ${reference}`);
        return;
      }
      throw err;
    }
  }
}
