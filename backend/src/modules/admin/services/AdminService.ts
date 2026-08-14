import { BaseService } from '../../../core/base/BaseService.js';
import type { IAdminService } from '../interfaces/IAdminService.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import type { ICacheService } from '../../../core/interfaces/ICacheService.js';

export class AdminService extends BaseService implements IAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: ICacheService,
  ) {
    super('AdminService');
  }

  async getDashboardStats(): Promise<any> {
    this.log('Fetching system-wide admin dashboard statistics');

    const [
      totalUsers,
      totalWorkers,
      totalProviders,
      totalAgents,
      totalBookings,
      totalJobs,
    ] = await Promise.all([
      this.prisma.client.user.count(),
      this.prisma.client.workerProfile.count(),
      this.prisma.client.providerProfile.count(),
      this.prisma.client.agentProfile.count(),
      this.prisma.client.booking.count(),
      this.prisma.client.job.count(),
    ]);

    return {
      totalUsers,
      totalWorkers,
      totalProviders,
      totalAgents,
      totalBookings,
      totalJobs,
    };
  }

  async updatePlatformSetting(key: string, value: string): Promise<any> {
    this.log('Updating platform setting', { key, value });

    const setting = await this.prisma.client.platformSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    const cacheKey = `setting:${key}`;
    await this.cache.del(cacheKey);

    return setting;
  }
}
