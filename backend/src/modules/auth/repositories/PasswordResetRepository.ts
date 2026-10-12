import { Prisma } from '@prisma/client';
import type { PasswordResetToken } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { DatabaseException } from '../../../core/exceptions/index.js';
import type { IPasswordResetRepository, CreatePasswordResetTokenInput } from '../interfaces/IPasswordResetRepository.js';

export class PasswordResetRepository extends BaseRepository<PasswordResetToken> implements IPasswordResetRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: CreatePasswordResetTokenInput, tx?: Prisma.TransactionClient): Promise<PasswordResetToken> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.passwordResetToken.create({
        data: {
          userId: data.userId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
        },
      });
    } catch (err) {
      throw new DatabaseException('Failed to create password reset token', err);
    }
  }

  async findValidByTokenHash(tokenHash: string, tx?: Prisma.TransactionClient): Promise<PasswordResetToken | null> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.passwordResetToken.findFirst({
        where: {
          tokenHash,
          usedAt: null,
          expiresAt: { gte: new Date() },
        },
      });
    } catch (err) {
      throw new DatabaseException('Failed to retrieve password reset token', err);
    }
  }

  async markUsed(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma.client;
    try {
      await client.passwordResetToken.update({
        where: { id },
        data: { usedAt: new Date() },
      });
    } catch (err) {
      throw new DatabaseException('Failed to mark password reset token as used', err);
    }
  }

  async invalidateAllForUser(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma.client;
    try {
      await client.passwordResetToken.updateMany({
        where: { userId, usedAt: null, expiresAt: { gte: new Date() } },
        data: { expiresAt: new Date() },
      });
    } catch (err) {
      throw new DatabaseException('Failed to invalidate previous password reset tokens', err);
    }
  }
}
