import type { WorkerProfile } from '@prisma/client';
import { BaseService } from '../../../core/base/BaseService.js';
import type { IWorkerService } from '../interfaces/IWorkerService.js';
import type { IWorkerRepository } from '../interfaces/IWorkerRepository.js';
import type { ICacheService } from '../../../core/interfaces/ICacheService.js';
import { ConflictException, NotFoundException } from '../../../core/exceptions/index.js';

export class WorkerService extends BaseService implements IWorkerService {
  constructor(
    private readonly workerRepo: IWorkerRepository,
    private readonly cache: ICacheService,
  ) {
    super('WorkerService');
  }

  async createProfile(
    userId: string,
    data: { bio?: string | null; experience: number; dailyRate?: number | null },
  ): Promise<WorkerProfile> {
    this.log('Creating worker profile', { userId });
    const existing = await this.workerRepo.findByUserId(userId);
    if (existing) {
      throw new ConflictException('Worker profile already exists for this user');
    }

    return await this.workerRepo.createProfile(userId, data);
  }

  async getMyProfile(userId: string): Promise<any> {
    this.log('Retrieving worker profile details', { userId });
    const profile = await this.workerRepo.getProfileWithSkillsAndUser(userId);
    if (!profile) {
      throw new NotFoundException('WorkerProfile', userId);
    }

    // Transform relation structure to flatten skill objects
    return {
      ...profile,
      skills: profile.skills.map((item: any) => item.skill),
    };
  }

  async updateProfile(
    userId: string,
    data: { bio?: string | null; experience?: number; dailyRate?: number | null },
  ): Promise<WorkerProfile> {
    this.log('Updating worker profile', { userId, data });
    return await this.workerRepo.updateProfile(userId, data);
  }

  async updateAvailability(userId: string, isAvailable: boolean): Promise<WorkerProfile> {
    this.log('Updating worker availability status', { userId, isAvailable });
    const updated = await this.workerRepo.updateAvailability(userId, isAvailable);

    // Sync Redis GEO presence index
    const workerWithSkills = await this.workerRepo.getProfileWithSkillsAndUser(userId);
    if (workerWithSkills) {
      for (const item of workerWithSkills.skills) {
        const geoKey = `geo:instant-workers:${item.skillId}`;
        
        if (
          isAvailable &&
          workerWithSkills.user.isActive &&
          workerWithSkills.latitude !== null &&
          workerWithSkills.longitude !== null
        ) {
          await this.cache.geoAdd(geoKey, {
            lat: Number(workerWithSkills.latitude),
            lng: Number(workerWithSkills.longitude),
            member: workerWithSkills.id,
          });
        } else {
          await this.cache.geoRemove(geoKey, workerWithSkills.id);
        }
      }
    }

    return updated;
  }
}
