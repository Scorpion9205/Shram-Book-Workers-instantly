import type { User, Prisma } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type { PaginatedResult } from '../../../core/base/BaseRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { DatabaseException } from '../../../core/exceptions/index.js';
import type { IUserRepository, UserFilter } from '../interfaces/IUserRepository.js';

export class UserRepository extends BaseRepository<User> implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.user.findUnique({
        where: { id },
      });
    } catch (err) {
      throw new DatabaseException(`Failed to find user by ID: ${id}`, err);
    }
  }

  async update(id: string, data: any, tx?: Prisma.TransactionClient): Promise<User> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.user.update({
        where: { id },
        data,
      });
    } catch (err) {
      throw new DatabaseException(`Failed to update user profile for ID: ${id}`, err);
    }
  }

  async delete(id: string, tx?: Prisma.TransactionClient): Promise<User> {
    const client = tx ?? this.prisma.client;
    try {
      // Perform soft delete by setting deletedAt and disabling the account
      return await client.user.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      });
    } catch (err) {
      throw new DatabaseException(`Failed to soft-delete user account for ID: ${id}`, err);
    }
  }

  async findManyByFilter(
    filter: UserFilter,
    page: number,
    limit: number,
    tx?: Prisma.TransactionClient,
  ): Promise<PaginatedResult<User>> {
    const client = tx ?? this.prisma.client;
    const skip = this.buildSkip(page, limit);

    const whereClause: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(filter.role && { role: filter.role }),
      ...(filter.isActive !== undefined && { isActive: filter.isActive }),
      ...(filter.isVerified !== undefined && { isVerified: filter.isVerified }),
      ...(filter.search && {
        OR: [
          { name: { contains: filter.search, mode: 'insensitive' } },
          { email: { contains: filter.search, mode: 'insensitive' } },
          { phone: { contains: filter.search, mode: 'insensitive' } },
        ],
      }),
    };

    try {
      const [items, total] = await Promise.all([
        client.user.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        client.user.count({ where: whereClause }),
      ]);

      return this.buildPaginatedResult(items, total, page, limit);
    } catch (err) {
      throw new DatabaseException('Error querying users by filter', err);
    }
  }
}
