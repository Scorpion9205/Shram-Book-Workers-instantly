import type { User, Prisma, UserRole } from '@prisma/client';
import type { PaginatedResult } from '../../../core/base/BaseRepository.js';

export interface UserFilter {
  role?: UserRole | undefined;
  isActive?: boolean | undefined;
  isVerified?: boolean | undefined;
  search?: string | undefined;
}

export interface IUserRepository {
  findById(id: string, tx?: Prisma.TransactionClient): Promise<User | null>;
  update(id: string, data: any, tx?: Prisma.TransactionClient): Promise<User>;
  delete(id: string, tx?: Prisma.TransactionClient): Promise<User>;
  findManyByFilter(
    filter: UserFilter,
    page: number,
    limit: number,
    tx?: Prisma.TransactionClient,
  ): Promise<PaginatedResult<User>>;
}
