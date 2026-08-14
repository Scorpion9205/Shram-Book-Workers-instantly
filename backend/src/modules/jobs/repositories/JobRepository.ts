import type { Job, Prisma } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type { IJobRepository } from '../interfaces/IJobRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';

export class JobRepository extends BaseRepository<Job> implements IJobRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<Job | null> {
    const client = tx || this.prisma.client;
    return client.job.findUnique({
      where: { id },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            baseRate: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        _count: {
          select: {
            applications: true,
            bookings: true,
          },
        },
      },
    }) as any;
  }

  async create(data: Prisma.JobUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<Job> {
    const client = tx || this.prisma.client;
    return client.job.create({
      data,
      include: {
        skill: true,
        provider: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }) as any;
  }

  async findManyOpenBySkillIds(skillIds: string[], tx?: Prisma.TransactionClient): Promise<any[]> {
    const client = tx || this.prisma.client;
    return client.job.findMany({
      where: {
        status: 'OPEN',
        skillId: { in: skillIds },
      },
      select: {
        id: true,
        title: true,
        description: true,
        budget: true,
        requiredWorkers: true,
        latitude: true,
        longitude: true,
        address: true,
        city: true,
        state: true,
        createdAt: true,
        skill: {
          select: {
            id: true,
            name: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(id: string, data: Prisma.JobUpdateInput, tx?: Prisma.TransactionClient): Promise<Job> {
    const client = tx || this.prisma.client;
    return client.job.update({
      where: { id },
      data,
    });
  }

  async findManyByProviderId(providerId: string, tx?: Prisma.TransactionClient): Promise<any[]> {
    const client = tx || this.prisma.client;
    return client.job.findMany({
      where: { providerId },
      select: {
        id: true,
        title: true,
        budget: true,
        requiredWorkers: true,
        status: true,
        createdAt: true,
        skill: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            applications: true,
            bookings: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
