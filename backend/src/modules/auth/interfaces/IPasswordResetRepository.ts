import type { PasswordResetToken } from '@prisma/client';

export interface CreatePasswordResetTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface IPasswordResetRepository {
  create(data: CreatePasswordResetTokenInput, tx?: any): Promise<PasswordResetToken>;
  findValidByTokenHash(tokenHash: string, tx?: any): Promise<PasswordResetToken | null>;
  markUsed(id: string, tx?: any): Promise<void>;
  invalidateAllForUser(userId: string, tx?: any): Promise<void>;
}
