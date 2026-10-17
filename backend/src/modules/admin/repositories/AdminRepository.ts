import { PaymentStatus, UserRole } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type {
  IAdminRepository,
  DashboardCounts,
  PlatformAnalyticsRawData,
  SkillRateRow,
} from '../interfaces/IAdminRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';

// Cross-table counts and raw numbers for the admin dashboard and analytics.
export class AdminRepository extends BaseRepository<any> implements IAdminRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  // Every skill with its base rate, for the admin rate editor.
  async listSkillRates(): Promise<SkillRateRow[]> {
    const skills = await this.prisma.client.skill.findMany({
      include: { category: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
    return skills.map((s) => ({
      id: s.id,
      name: s.name,
      baseRate: Number(s.baseRate),
      rateUnit: s.rateUnit,
      category: s.category?.name ?? null,
    }));
  }

  // Returns null when the skill doesn't exist.
  async updateSkillBaseRate(skillId: string, baseRate: number): Promise<SkillRateRow | null> {
    const existing = await this.prisma.client.skill.findUnique({ where: { id: skillId } });
    if (!existing) return null;
    const s = await this.prisma.client.skill.update({
      where: { id: skillId },
      data: { baseRate },
      include: { category: { select: { name: true } } },
    });
    return {
      id: s.id,
      name: s.name,
      baseRate: Number(s.baseRate),
      rateUnit: s.rateUnit,
      category: s.category?.name ?? null,
    };
  }

  // Total rows in the main tables. The six counts run in parallel.
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

  // Raw data for the analytics charts. Returns the individual signup/booking/payment rows
  // inside the date window; AdminService groups them into per-day buckets.
  // Revenue only counts payments that actually completed.
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
