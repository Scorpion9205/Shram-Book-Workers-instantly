import { Prisma } from '@prisma/client';
import type { Otp } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { DatabaseException } from '../../../core/exceptions/index.js';
import type { IOTPRepository, CreateOtpInput } from '../interfaces/IOTPRepository.js';
import { OTPPurpose } from '../enums/OTPPurpose.js';

export class OTPRepository extends BaseRepository<Otp> implements IOTPRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: CreateOtpInput, tx?: Prisma.TransactionClient): Promise<Otp> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.otp.create({
        data: {
          purpose: data.purpose,
          channel: data.channel,
          identifier: data.identifier,
          codeHash: data.codeHash,
          expiresAt: data.expiresAt,
          bookingId: data.bookingId ?? null,
        },
      });
    } catch (err) {
      throw new DatabaseException('Failed to create OTP record', err);
    }
  }

  async findActiveOTP(
    identifier: string,
    purpose: OTPPurpose,
    tx?: Prisma.TransactionClient,
  ): Promise<Otp | null> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.otp.findFirst({
        where: {
          identifier,
          purpose,
          consumedAt: null,
          expiresAt: { gte: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      throw new DatabaseException('Failed to retrieve active OTP record', err);
    }
  }

  async incrementAttempts(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma.client;
    try {
      await client.otp.update({
        where: { id },
        data: { attempts: { increment: 1 } },
      });
    } catch (err) {
      throw new DatabaseException('Failed to increment OTP verification attempts', err);
    }
  }

  async markConsumed(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma.client;
    try {
      await client.otp.update({
        where: { id },
        data: { consumedAt: new Date() },
      });
    } catch (err) {
      throw new DatabaseException('Failed to consume OTP record', err);
    }
  }

  async invalidatePrevious(
    identifier: string,
    purpose: OTPPurpose,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma.client;
    try {
      await client.otp.updateMany({
        where: {
          identifier,
          purpose,
          consumedAt: null,
          expiresAt: { gte: new Date() },
        },
        data: { expiresAt: new Date() },
      });
    } catch (err) {
      throw new DatabaseException('Failed to invalidate previous active OTPs', err);
    }
  }
}
