import type { PlatformSetting } from '@prisma/client';
import { BaseService } from '../../../core/base/BaseService.js';
import type { IPlatformSettingRepository } from '../interfaces/IPlatformSettingRepository.js';
import type { ICacheService } from '../../../core/interfaces/ICacheService.js';
import { CacheKeys } from '../../../infrastructure/cache/cacheKeys.js';
import { NotFoundException } from '../../../core/exceptions/index.js';

export class PlatformSettingService extends BaseService {
  constructor(
    private readonly settingRepo: IPlatformSettingRepository,
    private readonly cache: ICacheService,
  ) {
    super('PlatformSettingService');
  }

  async getSetting(key: string): Promise<any> {
    const cacheKey = CacheKeys.platformSetting(key);
    const cached = await this.cache.get<any>(cacheKey);

    if (cached !== null) {
      return cached;
    }

    const setting = await this.settingRepo.get(key);
    if (!setting) {
      throw new NotFoundException('PlatformSetting', key);
    }

    // Cache the setting for 60 seconds
    await this.cache.set(cacheKey, setting.value, 60);
    return setting.value;
  }

  async setSetting(key: string, value: any): Promise<PlatformSetting> {
    this.log('Updating platform setting', { key, value });
    const setting = await this.settingRepo.set(key, value);

    // Invalidate Redis cache immediately
    const cacheKey = CacheKeys.platformSetting(key);
    await this.cache.del(cacheKey);

    return setting;
  }

  async deleteSetting(key: string): Promise<void> {
    this.log('Deleting platform setting', { key });
    await this.settingRepo.delete(key);

    const cacheKey = CacheKeys.platformSetting(key);
    await this.cache.del(cacheKey);
  }

  async getNumber(key: string, defaultValue: number): Promise<number> {
    try {
      const val = await this.getSetting(key);
      const num = Number(val);
      return isNaN(num) ? defaultValue : num;
    } catch {
      return defaultValue;
    }
  }
}
