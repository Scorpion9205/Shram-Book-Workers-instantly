import type { Job, Prisma } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type { IJobRepository, JobListFilter } from '../interfaces/IJobRepository.js';
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

  async findManyOpenBySkillIds(skillIds: string[], filter?: JobListFilter, tx?: Prisma.TransactionClient): Promise<any[]> {
    const client = tx || this.prisma.client;

    const where: Prisma.JobWhereInput = {
      status: 'OPEN',
      // A category filter narrows to one specific skill; otherwise fall back to every
      // skill this worker/agent actually has, same as before this filter existed.
      skillId: filter?.category ? filter.category : { in: skillIds },
    };

    if (filter?.search) {
      where.title = { contains: filter.search, mode: 'insensitive' };
    }

    if (filter?.minSalary !== undefined || filter?.maxSalary !== undefined) {
      where.budget = {
        ...(filter.minSalary !== undefined && { gte: filter.minSalary }),
        ...(filter.maxSalary !== undefined && { lte: filter.maxSalary }),
      };
    }

    const orderBy: Prisma.JobOrderByWithRelationInput =
      filter?.sort === 'highest_salary' ? { budget: 'desc' } : { createdAt: 'desc' };
    // 'nearest' needs the requester's live coordinates and 'highest_rated' needs a join on
    // the provider's aggregate rating — both real features, neither built yet. Falling back
    // to 'latest' for those rather than silently accepting an option that does nothing was
    // the whole bug being fixed here, so this is called out explicitly, not hidden.

    return client.job.findMany({
      where,
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
      orderBy,
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
