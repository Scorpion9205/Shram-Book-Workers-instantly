import type { ProviderProfile } from '@prisma/client';
import { BaseService } from '../../../core/base/BaseService.js';
import type { IProviderService } from '../interfaces/IProviderService.js';
import type { IProviderRepository } from '../interfaces/IProviderRepository.js';
import { ConflictException, NotFoundException } from '../../../core/exceptions/index.js';

export class ProviderService extends BaseService implements IProviderService {
  constructor(private readonly providerRepo: IProviderRepository) {
    super('ProviderService');
  }

  async createProfile(
    userId: string,
    data: { providerType?: any; companyName?: string | null | undefined; description?: string | null | undefined },
  ): Promise<ProviderProfile> {
    this.log('Creating provider profile', { userId });
    
    const existing = await this.providerRepo.findByUserId(userId);
    if (existing) {
      throw new ConflictException('Provider profile already exists for this user');
    }

    return await this.providerRepo.createProfile(userId, data);
  }

  async getMyProfile(userId: string): Promise<ProviderProfile> {
    this.log('Fetching provider profile', { userId });
    
    let profile = await this.providerRepo.findByUserId(userId);
    if (!profile) {
      profile = await this.providerRepo.createProfile(userId, {});
    }

    return profile;
  }

  async updateProfile(
    userId: string,
    data: { providerType?: any; companyName?: string | null | undefined; description?: string | null | undefined },
  ): Promise<ProviderProfile> {
    this.log('Updating provider profile details', { userId, data });
    return await this.providerRepo.updateProfile(userId, data);
  }
}
