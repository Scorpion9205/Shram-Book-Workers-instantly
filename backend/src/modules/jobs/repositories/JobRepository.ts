import type { Job, Prisma } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type { IJobRepository, JobListFilter } from '../interfaces/IJobRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';

// Prisma queries for jobs. Each method picks only the columns its screen needs.
export class JobRepository extends BaseRepository<Job> implements IJobRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  // Detail view: skill, provider contact and how many applications/bookings the job has.
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

  // The job feed query: open jobs for the given skills, with optional search/salary/sort filters.
  async findManyOpenBySkillIds(skillIds: string[], filter?: JobListFilter, tx?: Prisma.TransactionClient): Promise<any[]> {
    const client = tx || this.prisma.client;

    const where: Prisma.JobWhereInput = {
      status: 'OPEN',
      // Picking a category narrows the feed to that one skill; otherwise show every skill
      // the worker/agent has.
      skillId: filter?.category ? filter.category : { in: skillIds },
    };

    // A scheduled job whose time has already passed is no longer worth showing in the feed.
    where.AND = [{ OR: [{ scheduledAt: null }, { scheduledAt: { gte: new Date() } }] }];

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
    // Only "latest" (default) and "highest salary" are real sort modes right now. "Nearest"
    // would need the user's live location and "highest rated" a join on provider ratings,
    // so both quietly fall back to latest until those are built.

    return client.job.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        budget: true,
        requiredWorkers: true,
        scheduledAt: true,
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

  // "My jobs" list for a provider, newest first, with application/booking counts for the badges.
  async findManyByProviderId(providerId: string, tx?: Prisma.TransactionClient): Promise<any[]> {
    const client = tx || this.prisma.client;
    return client.job.findMany({
      where: { providerId },
      select: {
        id: true,
        title: true,
        budget: true,
        requiredWorkers: true,
        scheduledAt: true,
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
