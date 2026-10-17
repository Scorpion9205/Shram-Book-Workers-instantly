import { Prisma } from '@prisma/client';
import type { Application } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type { IApplicationRepository } from '../interfaces/IApplicationRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { ConflictException } from '../../../core/exceptions/index.js';

// Prisma queries for job applications (both worker and agent applicants).
export class ApplicationRepository extends BaseRepository<Application> implements IApplicationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  // The DB has a unique (job, worker) and (job, agent) pair, so a duplicate apply comes back
  // as error P2002 - turned into a friendly "already applied" conflict here.
  async create(data: Prisma.ApplicationUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<Application> {
    const client = tx || this.prisma.client;
    try {
      return await client.application.create({ data });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('You have already applied to this job');
      }
      throw err;
    }
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

  async findByJobAndAgent(jobId: string, agentId: string, tx?: Prisma.TransactionClient): Promise<Application | null> {
    const client = tx || this.prisma.client;
    return client.application.findFirst({
      where: {
        jobId,
        agentId,
      },
    });
  }

  // What the provider sees when reviewing applicants: bid + applicant details, cheapest bid first.
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

  // Full application with its job, worker and agent - used when accepting/rejecting.
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

  // Used once a job is full: everyone still waiting gets rejected automatically.
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
            scheduledAt: true,
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
