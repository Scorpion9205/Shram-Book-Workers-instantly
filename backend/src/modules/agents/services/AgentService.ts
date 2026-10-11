import type { AgentProfile } from '@prisma/client';
import { BaseService } from '../../../core/base/BaseService.js';
import type { IAgentService } from '../interfaces/IAgentService.js';
import type { IAgentRepository } from '../interfaces/IAgentRepository.js';
import type {
  IAgentWorkerRepository,
  AgentWorkerRosterEntry,
  CreateManagedWorkerInput,
} from '../interfaces/IAgentWorkerRepository.js';
import type { IPlatformSettingRepository } from '../../platform-settings/interfaces/IPlatformSettingRepository.js';
import type { ICacheService } from '../../../core/interfaces/ICacheService.js';
import type { IWorkerService } from '../../workers/interfaces/IWorkerService.js';
import type { ILocationService } from '../../location/interfaces/ILocationService.js';
import type { IUserService } from '../../users/interfaces/IUserService.js';
import type { IApplicationService } from '../../jobs/interfaces/IApplicationService.js';
import type { IInstantRequestService } from '../../instant-requests/interfaces/IInstantRequestService.js';
import { BookingStatus, ApplicationStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { NotFoundException, BusinessException } from '../../../core/exceptions/index.js';
import { CacheKeys } from '../../../infrastructure/cache/cacheKeys.js';

const DEFAULT_AGENT_COMMISSION_PERCENT = 10;
const MINIMUM_COMMISSION_CHECKOUT = 2000;

export class AgentService extends BaseService implements IAgentService {
  constructor(
    private readonly agentRepo: IAgentRepository,
    private readonly agentWorkerRepo: IAgentWorkerRepository,
    private readonly prisma: PrismaService,
    private readonly platformSettingRepo: IPlatformSettingRepository,
    private readonly cache: ICacheService,
    private readonly workerService: IWorkerService,
    private readonly locationService: ILocationService,
    private readonly userService: IUserService,
    private readonly applicationService: IApplicationService,
    private readonly instantRequestService: IInstantRequestService,
  ) {
    super('AgentService');
  }

  async getOpenInstantRequests(agentUserId: string): Promise<any[]> {
    const agent = await this.getAgentByUserId(agentUserId);
    const roster = await this.agentWorkerRepo.findManyByAgentId(agent.id);
    const skillIds = [...new Set(roster.flatMap((entry) => entry.worker.skills.map((s) => s.skillId)))];
    return this.instantRequestService.getOpenRequestsForSkills(skillIds);
  }

  async assignWorkerToInstantItem(agentUserId: string, itemId: string, workerId: string): Promise<any> {
    this.log('Agent assigning worker to instant request item', { agentUserId, itemId, workerId });
    const agent = await this.getAgentByUserId(agentUserId);
    const link = await this.getAgentWorkerLink(agent.id, workerId);

    return this.instantRequestService.assignWorkerToItem(agent.id, itemId, workerId, link.worker.userId);
  }

  async getWorkerEarnings(agentUserId: string, workerId: string): Promise<any> {
    const agent = await this.getAgentByUserId(agentUserId);
    await this.getAgentWorkerLink(agent.id, workerId);
    return this.agentRepo.findWorkerEarnings(agent.id, workerId);
  }

  async payoutWorker(agentUserId: string, workerId: string, method: 'CASH' | 'BANK_TRANSFER'): Promise<void> {
    this.log('Agent marking worker payout as paid', { agentUserId, workerId, method });
    const agent = await this.getAgentByUserId(agentUserId);
    await this.getAgentWorkerLink(agent.id, workerId);
    const count = await this.agentRepo.markWorkerBookingsPaid(agent.id, workerId, method);
    if (count === 0) {
      throw new BusinessException('NOTHING_TO_PAY', 'This worker has no pending payout right now.');
    }
  }

  async setWorkerBankDetails(
    agentUserId: string,
    workerId: string,
    data: { accountHolderName: string; accountNumber: string; ifscCode: string; bankName: string },
  ): Promise<AgentWorkerRosterEntry> {
    const agent = await this.getAgentByUserId(agentUserId);
    await this.getAgentWorkerLink(agent.id, workerId);
    return this.agentWorkerRepo.setWorkerBankDetails(workerId, data);
  }

  async assignWorkerToApplication(agentUserId: string, applicationId: string, workerId: string): Promise<any> {
    this.log('Agent assigning worker to application', { agentUserId, applicationId, workerId });
    const agent = await this.getAgentByUserId(agentUserId);
    await this.getAgentWorkerLink(agent.id, workerId);

    return this.applicationService.assignWorkerToApplication(agent.id, applicationId, workerId);
  }

  private async getAgentWorkerLink(agentId: string, workerId: string) {
    const link = await this.agentWorkerRepo.findLinkByAgentAndWorker(agentId, workerId);
    if (!link) {
      throw new NotFoundException('AgentWorker', workerId);
    }
    return link;
  }

  async createManagedWorker(agentUserId: string, data: CreateManagedWorkerInput): Promise<AgentWorkerRosterEntry> {
    this.log('Creating agent-managed worker', { agentUserId, name: data.name });
    const agent = await this.getAgentByUserId(agentUserId);
    return this.agentWorkerRepo.createManagedWorker(agent.id, data);
  }

  async listMyWorkers(agentUserId: string): Promise<AgentWorkerRosterEntry[]> {
    this.log('Listing agent worker roster', { agentUserId });
    const agent = await this.getAgentByUserId(agentUserId);
    return this.agentWorkerRepo.findManyByAgentId(agent.id);
  }

  async setWorkerAvailability(
    agentUserId: string,
    workerId: string,
    isAvailable: boolean,
    location?: { latitude: number; longitude: number },
  ): Promise<void> {
    this.log('Agent setting worker availability', { agentUserId, workerId, isAvailable });
    const agent = await this.getAgentByUserId(agentUserId);
    const link = await this.getAgentWorkerLink(agent.id, workerId);

    // A phone-less worker has no GPS of their own — the Agent supplies (or updates) their
    // approximate work location before/while marking them available. Reuses the exact same
    // geo-index sync WorkerService.updateAvailability already does, so this worker is matched
    // by instant-request/job searches identically to a self-managed one.
    if (location) {
      await this.locationService.updateLocation(link.worker.userId, location);
    }
    await this.workerService.updateAvailability(link.worker.userId, isAvailable);
  }

  async setWorkerVerified(agentUserId: string, workerId: string, verified: boolean): Promise<AgentWorkerRosterEntry> {
    this.log('Agent setting worker trust flag', { agentUserId, workerId, verified });
    const agent = await this.getAgentByUserId(agentUserId);
    await this.getAgentWorkerLink(agent.id, workerId);
    return this.agentWorkerRepo.setVerified(agent.id, workerId, verified);
  }

  async removeWorker(agentUserId: string, workerId: string): Promise<void> {
    this.log('Agent removing worker from roster', { agentUserId, workerId });
    const agent = await this.getAgentByUserId(agentUserId);
    const link = await this.getAgentWorkerLink(agent.id, workerId);

    await this.userService.deleteAccount(link.worker.userId);
    await this.agentWorkerRepo.deleteLink(agent.id, workerId);
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
        checkedOut: b.commissionCheckedOutAt !== null,
      };
    });

    const totalGrossBookingValue = commissions.reduce((sum, c) => sum + c.grossAmount, 0);
    const totalEarnings = commissions.reduce((sum, c) => sum + c.commission, 0);
    // What the Agent can actually checkout right now — commission already checked out on a
    // past booking doesn't count again, even though it's still part of totalEarnings (lifetime).
    const pendingCheckoutAmount =
      Math.round(commissions.filter((c) => !c.checkedOut).reduce((sum, c) => sum + c.commission, 0) * 100) / 100;

    // No fixed salary is ever tracked here — that's paid externally by the company. This is
    // purely the Agent's informational commission figure (on completed/settled work sourced
    // through them), bucketed by period for the Dashboard/Commissions page dropdown.
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sumSince = (since: Date) =>
      Math.round(
        commissions
          .filter((c) => c.completedAt && c.completedAt >= since)
          .reduce((sum, c) => sum + c.commission, 0) * 100,
      ) / 100;

    return {
      commissionPercent,
      bookingCount: commissions.length,
      totalGrossBookingValue,
      totalEarnings,
      todayEarnings: sumSince(startOfToday),
      monthEarnings: sumSince(startOfMonth),
      pendingCheckoutAmount,
      minimumCheckoutAmount: MINIMUM_COMMISSION_CHECKOUT,
      recentCommissions: commissions.slice(0, 20),
    };
  }

  async checkoutCommission(userId: string): Promise<{ checkedOutAmount: number }> {
    this.log('Agent checking out commission', { agentUserId: userId });
    const summary = await this.getCommissionSummary(userId);

    if (summary.pendingCheckoutAmount < MINIMUM_COMMISSION_CHECKOUT) {
      throw new BusinessException(
        'MINIMUM_CHECKOUT_NOT_MET',
        `You need at least ₹${MINIMUM_COMMISSION_CHECKOUT} pending commission to checkout (currently ₹${summary.pendingCheckoutAmount}).`,
      );
    }

    const agent = await this.getAgentByUserId(userId);
    await this.agentRepo.markCommissionCheckedOut(agent.id);

    return { checkedOutAmount: summary.pendingCheckoutAmount };
  }
}
