import type { Transaction, Prisma } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type { ITransactionRepository } from '../interfaces/ITransactionRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';

export class TransactionRepository extends BaseRepository<Transaction> implements ITransactionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: Prisma.TransactionUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<Transaction> {
    const client = tx || this.prisma.client;
    return client.transaction.create({ data });
  }

  async findManyByWalletId(walletId: string, tx?: Prisma.TransactionClient): Promise<Transaction[]> {
    const client = tx || this.prisma.client;
    return client.transaction.findMany({
      where: { walletId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
