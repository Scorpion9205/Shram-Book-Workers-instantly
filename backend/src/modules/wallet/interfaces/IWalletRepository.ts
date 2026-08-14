import type { Wallet, Prisma } from '@prisma/client';

export interface IWalletRepository {
  findByWorkerId(workerId: string, tx?: Prisma.TransactionClient): Promise<Wallet | null>;
  create(workerId: string, tx?: Prisma.TransactionClient): Promise<Wallet>;
  updateBalance(id: string, balance: number, tx?: Prisma.TransactionClient): Promise<Wallet>;
}
