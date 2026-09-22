import type { Wallet, Prisma } from '@prisma/client';

export interface IWalletRepository {
  findByWorkerId(workerId: string, tx?: Prisma.TransactionClient): Promise<Wallet | null>;
  create(workerId: string, tx?: Prisma.TransactionClient): Promise<Wallet>;
  updateBalance(id: string, balance: number, tx?: Prisma.TransactionClient): Promise<Wallet>;
  incrementBalance(id: string, amount: number, tx?: Prisma.TransactionClient): Promise<Wallet>;
  decrementBalance(id: string, amount: number, allowNegative?: boolean, tx?: Prisma.TransactionClient): Promise<Wallet>;
  creditWithTransaction(workerId: string, amount: number, purpose: string, referenceId?: string): Promise<void>;
  debitWithTransaction(workerId: string, amount: number, purpose: string, referenceId?: string, allowNegative?: boolean): Promise<void>;
}
