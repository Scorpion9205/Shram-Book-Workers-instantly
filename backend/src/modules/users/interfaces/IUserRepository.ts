import type { User, Prisma } from '@prisma/client';

export interface IUserRepository {
  findById(id: string, tx?: Prisma.TransactionClient): Promise<User | null>;
  update(id: string, data: any, tx?: Prisma.TransactionClient): Promise<User>;
  delete(id: string, tx?: Prisma.TransactionClient): Promise<User>;
}
