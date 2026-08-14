import type { Application, Prisma } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type { IApplicationRepository } from '../interfaces/IApplicationRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';

export class ApplicationRepository extends BaseRepository<Application> implements IApplicationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: Prisma.ApplicationUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<Application> {
    const client = tx || this.prisma.client;
    return client.application.create({ data });
  }

  async findByJobAndWorker(jobId: string, workerId: string, tx?: Prisma.TransactionClient): Promise<Application | null> {
    const client = tx || this.prisma.client;
    return client.application.findFirst({
      where: {
        jobId,
        workerId,
      },
    });
  }

  async findManyByJobId(jobId: string, tx?: Prisma.TransactionClient): Promise<any[]> {
    const client = tx || this.prisma.client;
    return client.application.findMany({
      where: { jobId },
      select: {
        id: true,
        bidAmount: true,
        workerCount: true,
        status: true,
        createdAt: true,
        worker: {
          select: {
            experience: true,
            dailyRate: true,
            rating: true,
            totalJobs: true,
            user: {
              select: {
                name: true,
                phone: true,
                profileImage: true,
              },
            },
          },
        },
        agent: {
          select: {
            agencyName: true,
            rating: true,
            user: {
              select: {
                name: true,
                phone: true,
                profileImage: true,
              },
            },
          },
        },
      },
      orderBy: {
        bidAmount: 'asc',
      },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<any | null> {
    const client = tx || this.prisma.client;
    return client.application.findUnique({
      where: { id },
      include: {
        job: true,
        worker: true,
        agent: true,
      },
    });
  }

  async update(id: string, data: Prisma.ApplicationUpdateInput, tx?: Prisma.TransactionClient): Promise<Application> {
    const client = tx || this.prisma.client;
    return client.application.update({
      where: { id },
      data,
    });
  }

  async updateManyPendingToRejected(jobId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma.client;
    await client.application.updateMany({
      where: {
        jobId,
        status: 'PENDING',
      },
      data: {
        status: 'REJECTED',
      },
    });
  }

  async findManyByWorkerId(workerId: string, tx?: Prisma.TransactionClient): Promise<any[]> {
    const client = tx || this.prisma.client;
    return client.application.findMany({
      where: { workerId },
      select: {
        id: true,
        bidAmount: true,
        status: true,
        createdAt: true,
        job: {
          select: {
            id: true,
            title: true,
            budget: true,
            address: true,
            city: true,
            requiredWorkers: true,
            status: true,
            provider: {
              select: {
                name: true,
                phone: true,
              },
            },
            skill: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
