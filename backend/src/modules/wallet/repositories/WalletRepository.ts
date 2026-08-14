import type { Wallet, Prisma } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type { IWalletRepository } from '../interfaces/IWalletRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';

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
}
