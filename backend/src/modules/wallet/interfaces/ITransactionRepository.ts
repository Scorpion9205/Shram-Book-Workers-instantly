import type { Transaction, Prisma } from '@prisma/client';

export interface ITransactionRepository {
  create(data: Prisma.TransactionUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<Transaction>;
  findManyByWalletId(walletId: string, tx?: Prisma.TransactionClient): Promise<Transaction[]>;
}
