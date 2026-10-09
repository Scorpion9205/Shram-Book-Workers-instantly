import { PaymentStatus, UserRole } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type { IAdminRepository, DashboardCounts, PlatformAnalyticsRawData } from '../interfaces/IAdminRepository.js';
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

  async getPlatformAnalyticsData(trendStart: Date, trendEnd: Date): Promise<PlatformAnalyticsRawData> {
    const [activeWorkers, activeProviders, revenueAgg, signups, bookings, revenueEntries] = await Promise.all([
      this.prisma.client.user.count({ where: { role: UserRole.WORKER, isActive: true } }),
      this.prisma.client.user.count({ where: { role: UserRole.PROVIDER, isActive: true } }),
      this.prisma.client.payment.aggregate({
        where: { status: PaymentStatus.COMPLETED },
        _sum: { amount: true },
      }),
      this.prisma.client.user.findMany({
        where: { createdAt: { gte: trendStart, lt: trendEnd } },
        select: { createdAt: true },
      }),
      this.prisma.client.booking.findMany({
        where: { createdAt: { gte: trendStart, lt: trendEnd } },
        select: { createdAt: true },
      }),
      this.prisma.client.payment.findMany({
        where: { status: PaymentStatus.COMPLETED, createdAt: { gte: trendStart, lt: trendEnd } },
        select: { createdAt: true, amount: true },
      }),
    ]);

    return {
      activeWorkers,
      activeProviders,
      totalRevenue: revenueAgg._sum.amount ? Number(revenueAgg._sum.amount) : 0,
      signups,
      bookings,
      revenueEntries: revenueEntries.map((r) => ({ createdAt: r.createdAt, amount: Number(r.amount) })),
    };
  }
}
