import type { AgentProfile } from '@prisma/client';
import { BaseService } from '../../../core/base/BaseService.js';
import type { IAgentService } from '../interfaces/IAgentService.js';
import type { IAgentRepository } from '../interfaces/IAgentRepository.js';
import type { IAgentWorkerRepository } from '../interfaces/IAgentWorkerRepository.js';
import type { IPlatformSettingRepository } from '../../platform-settings/interfaces/IPlatformSettingRepository.js';
import type { ICacheService } from '../../../core/interfaces/ICacheService.js';
import { BookingStatus, ApplicationStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { NotFoundException, BusinessException } from '../../../core/exceptions/index.js';
import { CacheKeys } from '../../../infrastructure/cache/cacheKeys.js';

const DEFAULT_AGENT_COMMISSION_PERCENT = 10;

export class AgentService extends BaseService implements IAgentService {
  constructor(
    private readonly agentRepo: IAgentRepository,
    private readonly agentWorkerRepo: IAgentWorkerRepository,
    private readonly prisma: PrismaService,
    private readonly platformSettingRepo: IPlatformSettingRepository,
    private readonly cache: ICacheService,
  ) {
    super('AgentService');
  }

  private async getAgentCommissionPercent(): Promise<number> {
    const cacheKey = CacheKeys.platformSetting('agentCommissionPercent');
    const cached = await this.cache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const setting = await this.platformSettingRepo.get('agentCommissionPercent');
    const percent = setting && setting.value ? Number(setting.value) : DEFAULT_AGENT_COMMISSION_PERCENT;

    await this.cache.set(cacheKey, percent, 60);
    return percent;
  }

  private async getAgentByUserId(userId: string): Promise<AgentProfile> {
    const agent = await this.agentRepo.findByUserId(userId);
    if (!agent) {
      throw new NotFoundException('AgentProfile', userId);
    }
    return agent;
  }

  async createProfile(userId: string, data: any): Promise<AgentProfile> {
    this.log('Creating agent profile', { userId });

    const existing = await this.agentRepo.findByUserId(userId);
    if (existing) {
      throw new BusinessException('AGENT_PROFILE_EXISTS', 'Agent profile already exists.');
    }

    return this.agentRepo.create(userId, data);
  }

  async getMyProfile(userId: string): Promise<any> {
    this.log('Retrieving agent profile details', { userId });
    const profile = await this.prisma.client.agentProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            city: true,
            state: true,
            profileImage: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('AgentProfile', userId);
    }

    return profile;
  }

  async updateProfile(userId: string, data: any): Promise<AgentProfile> {
    this.log('Updating agent profile details', { userId, data });

    const exists = await this.agentRepo.findByUserId(userId);
    if (!exists) {
      throw new NotFoundException('AgentProfile', userId);
    }

    return this.agentRepo.update(userId, {
      ...(data.agencyName !== undefined && { agencyName: data.agencyName }),
      ...(data.description !== undefined && { description: data.description }),
    });
  }

  async getDashboard(userId: string): Promise<any> {
    this.log('Fetching agent dashboard counters', { userId });
    const agent = await this.getAgentByUserId(userId);

    const [
      totalWorkers,
      availableWorkers,
      pendingApplications,
      activeBookings,
      completedBookings,
    ] = await Promise.all([
      this.agentWorkerRepo.countByAgentId(agent.id),
      this.agentWorkerRepo.countAvailableByAgentId(agent.id),
      this.prisma.client.application.count({
        where: {
          agentId: agent.id,
          status: ApplicationStatus.PENDING,
        },
      }),
      this.prisma.client.booking.count({
        where: {
          agentId: agent.id,
          status: {
            in: [
              BookingStatus.CREATED,
              BookingStatus.PAYMENT_PENDING,
              BookingStatus.PAYMENT_CONFIRMED,
              BookingStatus.WORKER_ASSIGNED,
              BookingStatus.WORKER_EN_ROUTE,
              BookingStatus.OTP_VERIFIED,
              BookingStatus.WORK_STARTED,
            ],
          },
        },
      }),
      this.prisma.client.booking.count({
        where: {
          agentId: agent.id,
          status: BookingStatus.WORK_COMPLETED,
        },
      }),
    ]);

    return {
      agencyName: agent.agencyName,
      rating: agent.rating,
      totalWorkers,
      availableWorkers,
      pendingApplications,
      activeBookings,
      completedBookings,
    };
  }

  async getMyApplications(userId: string): Promise<any[]> {
    this.log('Retrieving my applications', { agentUserId: userId });
    const agent = await this.getAgentByUserId(userId);

    return this.prisma.client.application.findMany({
      where: { agentId: agent.id },
      include: {
        job: {
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                phone: true,
                profileImage: true,
              },
            },
            skill: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getMyBookings(userId: string): Promise<any[]> {
    this.log('Retrieving bookings for agent', { agentUserId: userId });
    const agent = await this.getAgentByUserId(userId);

    return this.prisma.client.booking.findMany({
      where: { agentId: agent.id },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            phone: true,
            profileImage: true,
          },
        },
        job: {
          include: {
            skill: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getCommissionSummary(userId: string): Promise<any> {
    this.log('Calculating agent commission summary', { agentUserId: userId });
    const agent = await this.getAgentByUserId(userId);

    const [bookings, commissionPercent] = await Promise.all([
      this.agentRepo.findCommissionableBookings(agent.id),
      this.getAgentCommissionPercent(),
    ]);

    const commissions = bookings.map((b) => {
      const grossAmount = b.finalFare ?? b.amount;
      return {
        bookingId: b.id,
        grossAmount,
        commission: Math.round(grossAmount * (commissionPercent / 100) * 100) / 100,
        completedAt: b.completedAt,
      };
    });

    const totalGrossBookingValue = commissions.reduce((sum, c) => sum + c.grossAmount, 0);
    const totalEarnings = commissions.reduce((sum, c) => sum + c.commission, 0);

    return {
      commissionPercent,
      bookingCount: commissions.length,
      totalGrossBookingValue,
      totalEarnings,
      recentCommissions: commissions.slice(0, 20),
    };
  }
}
