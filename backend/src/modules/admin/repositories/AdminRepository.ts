import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type { IAdminRepository, DashboardCounts } from '../interfaces/IAdminRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';

export class AdminRepository extends BaseRepository<any> implements IAdminRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getDashboardCounts(): Promise<DashboardCounts> {
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
}
