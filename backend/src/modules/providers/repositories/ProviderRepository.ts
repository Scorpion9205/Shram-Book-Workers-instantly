import type { ProviderProfile, Prisma } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { DatabaseException } from '../../../core/exceptions/index.js';
import type { IProviderRepository } from '../interfaces/IProviderRepository.js';

export class ProviderRepository extends BaseRepository<ProviderProfile> implements IProviderRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByUserId(userId: string, tx?: Prisma.TransactionClient): Promise<ProviderProfile | null> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.providerProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              role: true,
              address: true,
              city: true,
              state: true,
              pincode: true,
              profileImage: true,
            },
          },
        },
      });
    } catch (err) {
      throw new DatabaseException(`Failed to find provider profile by user ID: ${userId}`, err);
    }
  }

  async createProfile(
    userId: string,
    data: { providerType?: any; companyName?: string | null; description?: string | null },
    tx?: Prisma.TransactionClient,
  ): Promise<ProviderProfile> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.providerProfile.create({
        data: {
          userId,
          providerType: data.providerType,
          companyName: data.companyName ?? null,
          description: data.description ?? null,
        },
      });
    } catch (err) {
      throw new DatabaseException(`Failed to create provider profile for user ID: ${userId}`, err);
    }
  }

  async updateProfile(
    userId: string,
    data: { providerType?: any; companyName?: string | null; description?: string | null },
    tx?: Prisma.TransactionClient,
  ): Promise<ProviderProfile> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.providerProfile.update({
        where: { userId },
        data: {
          ...(data.providerType !== undefined && { providerType: data.providerType }),
          ...(data.companyName !== undefined && { companyName: data.companyName }),
          ...(data.description !== undefined && { description: data.description }),
        },
      });
    } catch (err) {
      throw new DatabaseException(`Failed to update provider profile for user ID: ${userId}`, err);
    }
  }
}
