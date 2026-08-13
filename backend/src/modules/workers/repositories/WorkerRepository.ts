import type { WorkerProfile, Prisma } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { DatabaseException } from '../../../core/exceptions/index.js';
import type { IWorkerRepository } from '../interfaces/IWorkerRepository.js';

export class WorkerRepository extends BaseRepository<WorkerProfile> implements IWorkerRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByUserId(userId: string, tx?: Prisma.TransactionClient): Promise<WorkerProfile | null> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.workerProfile.findUnique({
        where: { userId },
      });
    } catch (err) {
      throw new DatabaseException(`Failed to find worker profile by user ID: ${userId}`, err);
    }
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<WorkerProfile | null> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.workerProfile.findUnique({
        where: { id },
      });
    } catch (err) {
      throw new DatabaseException(`Failed to find worker profile by ID: ${id}`, err);
    }
  }

  async createProfile(
    userId: string,
    data: { bio?: string | null | undefined; experience: number; dailyRate?: number | null | undefined },
    tx?: Prisma.TransactionClient,
  ): Promise<WorkerProfile> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.workerProfile.create({
        data: {
          userId,
          bio: data.bio ?? null,
          experience: data.experience,
          dailyRate: data.dailyRate ?? null,
        },
      });
    } catch (err) {
      throw new DatabaseException(`Failed to create worker profile for user ID: ${userId}`, err);
    }
  }

  async updateProfile(
    userId: string,
    data: { bio?: string | null | undefined; experience?: number | undefined; dailyRate?: number | null | undefined },
    tx?: Prisma.TransactionClient,
  ): Promise<WorkerProfile> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.workerProfile.upsert({
        where: { userId },
        create: {
          userId,
          bio: data.bio ?? null,
          experience: data.experience ?? 0,
          dailyRate: data.dailyRate ?? null,
        },
        update: {
          ...(data.bio !== undefined && { bio: data.bio }),
          ...(data.experience !== undefined && { experience: data.experience }),
          ...(data.dailyRate !== undefined && { dailyRate: data.dailyRate }),
        },
      });
    } catch (err) {
      throw new DatabaseException(`Failed to update worker profile for user ID: ${userId}`, err);
    }
  }

  async updateAvailability(
    userId: string,
    isAvailable: boolean,
    tx?: Prisma.TransactionClient,
  ): Promise<WorkerProfile> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.workerProfile.upsert({
        where: { userId },
        create: {
          userId,
          isAvailable,
        },
        update: {
          isAvailable,
        },
      });
    } catch (err) {
      throw new DatabaseException(`Failed to update worker availability for user ID: ${userId}`, err);
    }
  }

  async getProfileWithSkillsAndUser(userId: string, tx?: Prisma.TransactionClient): Promise<any> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.workerProfile.upsert({
        where: { userId },
        update: {},
        create: {
          userId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              profileImage: true,
              city: true,
              state: true,
              address: true,
              pincode: true,
              isActive: true,
            },
          },
          skills: {
            select: {
              skillId: true,
              skill: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    } catch (err) {
      throw new DatabaseException(`Failed to fetch populated worker profile for user ID: ${userId}`, err);
    }
  }
}
