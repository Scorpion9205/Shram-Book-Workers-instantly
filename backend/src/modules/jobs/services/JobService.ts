import type { Job } from '@prisma/client';
import { BaseService } from '../../../core/base/BaseService.js';
import type { IJobService } from '../interfaces/IJobService.js';
import type { IJobRepository, JobListFilter } from '../interfaces/IJobRepository.js';
import type { IWorkerRepository } from '../../workers/interfaces/IWorkerRepository.js';
import type { IAgentRepository } from '../../agents/interfaces/IAgentRepository.js';
import type { IAgentWorkerRepository } from '../../agents/interfaces/IAgentWorkerRepository.js';
import type { ICacheService } from '../../../core/interfaces/ICacheService.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { CacheInvalidationService } from '../../../shared/services/cache/cache-invalidation.service.js';
import { NotFoundException, AuthenticationException, BusinessException } from '../../../core/exceptions/index.js';

export class JobService extends BaseService implements IJobService {
  constructor(
    private readonly jobRepo: IJobRepository,
    private readonly workerRepo: IWorkerRepository,
    private readonly agentRepo: IAgentRepository,
    private readonly agentWorkerRepo: IAgentWorkerRepository,
    private readonly cache: ICacheService,
    private readonly prisma: PrismaService,
  ) {
    super('JobService');
  }

  async createJob(userId: string, data: any): Promise<Job> {
    this.log('Creating a new job posting', { providerId: userId, skillId: data.skillId });

    await this.prisma.client.providerProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    const skill = await this.prisma.client.skill.findUnique({
      where: { id: data.skillId },
    });

    if (!skill) {
      throw new NotFoundException('Skill', data.skillId);
    }

    const job = await this.jobRepo.create({
      title: data.title,
      description: data.description ?? null,
      skillId: data.skillId,
      requiredWorkers: data.requiredWorkers,
      budget: data.budget ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      pincode: data.pincode ?? null,
      providerId: userId,
    });

    await CacheInvalidationService.afterJobCreated(userId);
    return job;
  }

  async getAllJobs(userId: string, filter?: JobListFilter): Promise<any> {
    this.log('Retrieving jobs for user', { userId, filter });

    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User', userId);
    }

    let cacheKey = '';
    let skillIds: string[] = [];

    if (user.role === 'WORKER') {
      cacheKey = `jobs:worker:${userId}`;
      const worker = await this.workerRepo.findByUserId(userId);
      if (!worker) {
        throw new NotFoundException('WorkerProfile', userId);
      }

      const workerWithSkills = await this.workerRepo.getProfileWithSkillsAndUser(userId);
      skillIds = workerWithSkills?.skills?.map((s: any) => s.skillId) || [];
    } else if (user.role === 'AGENT') {
      cacheKey = `jobs:agent:${userId}`;
      const agent = await this.agentRepo.findByUserId(userId);
      if (!agent) {
        throw new NotFoundException('AgentProfile', userId);
      }

      const linkedWorkers = await this.agentWorkerRepo.findManyByAgentId(agent.id);
      skillIds = [
        ...new Set(
          linkedWorkers.flatMap((item: any) =>
            item.worker.skills.map((skill: any) => skill.skillId)
          )
        ),
      ] as string[];
    } else {
      throw new AuthenticationException('Only workers and agents can access jobs.');
    }

    if (skillIds.length === 0) {
      return { jobs: [] };
    }

    // Caching is keyed only by userId (the common "just open my job feed" case) — a specific
    // search/category/sort combination would either serve another filter's stale results or
    // need the whole filter object folded into the key for correctness. Simplest safe choice:
    // bypass the cache entirely whenever any filter is actually active.
    const hasFilter = Boolean(filter?.search || filter?.category || filter?.minSalary !== undefined || filter?.maxSalary !== undefined || filter?.sort);

    if (!hasFilter) {
      const cachedJobs = await this.cache.get<any>(cacheKey);
      if (cachedJobs) {
        this.log('Retrieved jobs from cache', { cacheKey });
        return cachedJobs;
      }
    }

    const jobs = await this.jobRepo.findManyOpenBySkillIds(skillIds, filter);
    const result = { jobs };

    if (!hasFilter) {
      await this.cache.set(cacheKey, result, 120);
    }

    return result;
  }

  async getJobById(jobId: string, userId?: string): Promise<any> {
    this.log('Retrieving job details by id', { jobId, userId });
    const job = await this.jobRepo.findById(jobId) as any;
    if (!job) {
      throw new NotFoundException('Job', jobId);
    }

    let hasApplied = false;
    if (userId) {
      const worker = await this.prisma.client.workerProfile.findUnique({
        where: { userId }
      });
      if (worker) {
        const app = await this.prisma.client.application.findFirst({
          where: { jobId, workerId: worker.id }
        });
        if (app) {
          hasApplied = true;
        }
      } else {
        const agent = await this.prisma.client.agentProfile.findUnique({
          where: { userId }
        });
        if (agent) {
          const app = await this.prisma.client.application.findFirst({
            where: { jobId, agentId: agent.id }
          });
          if (app) {
            hasApplied = true;
          }
        }
      }
    }

    return { ...job, hasApplied };
  }

  async getProviderJobs(userId: string): Promise<any[]> {
    this.log('Retrieving jobs posted by provider', { providerId: userId });
    return this.jobRepo.findManyByProviderId(userId);
  }
}
