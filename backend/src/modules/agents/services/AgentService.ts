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
import { splitSettledBooking } from '../../../shared/pricing/bookingPricing.js';

// Used when the admin hasn't set an "agentCommissionPercent" platform setting.
const DEFAULT_AGENT_COMMISSION_PERCENT = 3;

/**
 * Everything an agent (agency) does: manage a roster of phone-less workers, take jobs and
 * instant requests on their behalf, pay them out manually, and cash out the agent's own
 * commission.
 *
 * Almost every method starts by turning the logged-in user into an AgentProfile and, for
 * worker actions, checking that the worker really belongs to this agent's roster.
 */
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

  // Open instant requests the agency could actually serve, i.e. ones that need a skill that
  // at least one roster worker has.
  async getOpenInstantRequests(agentUserId: string): Promise<any[]> {
    const agent = await this.getAgentByUserId(agentUserId);
    const roster = await this.agentWorkerRepo.findManyByAgentId(agent.id);
    const skillIds = [...new Set(roster.flatMap((entry) => entry.worker.skills.map((s) => s.skillId)))];
    return this.instantRequestService.getOpenRequestsForSkills(skillIds);
  }

  // Fill one slot of an instant request with a roster worker (the agent accepts for them).
  async assignWorkerToInstantItem(agentUserId: string, itemId: string, workerId: string): Promise<any> {
    this.log('Agent assigning worker to instant request item', { agentUserId, itemId, workerId });
    const agent = await this.getAgentByUserId(agentUserId);
    const link = await this.getAgentWorkerLink(agent.id, workerId);

    return this.instantRequestService.assignWorkerToItem(agent.id, itemId, workerId, link.worker.userId);
  }

  // How much a roster worker has earned, how much was already paid out, and how much is still owed.
  async getWorkerEarnings(agentUserId: string, workerId: string): Promise<any> {
    const agent = await this.getAgentByUserId(agentUserId);
    await this.getAgentWorkerLink(agent.id, workerId);

    const summary = await this.agentRepo.findWorkerEarnings(agent.id, workerId);

    // The repository gives full booking amounts; the worker's own share is the work charge.
    let totalEarned = 0;
    let totalPaid = 0;
    let payableNow = 0;
    const bookings = summary.bookings.map((b) => {
      const share = splitSettledBooking(b, true).worker;
      totalEarned += share;
      if (b.payoutPaidAt) totalPaid += share;
      else if (b.fundsReleased) payableNow += share;
      return { ...b, amount: share };
    });

    const round2 = (n: number) => Math.round(n * 100) / 100;
    return {
      totalEarned: round2(totalEarned),
      totalPaid: round2(totalPaid),
      totalPending: round2(totalEarned - totalPaid),
      payableNow: round2(payableNow),
      bookings,
    };
  }

  // The app never moves money itself. The agent pays the worker (cash or bank transfer)
  // and then clicks "Paid" - this records that for every settled booking not yet paid out.
  async payoutWorker(agentUserId: string, workerId: string, method: 'CASH' | 'BANK_TRANSFER'): Promise<void> {
    this.log('Agent marking worker payout as paid', { agentUserId, workerId, method });
    const agent = await this.getAgentByUserId(agentUserId);
    await this.getAgentWorkerLink(agent.id, workerId);
    const count = await this.agentRepo.markWorkerBookingsPaid(agent.id, workerId, method);
    if (count === 0) {
      throw new BusinessException(
        'NOTHING_TO_PAY',
        "Nothing to pay this worker yet. Request the workers' payout first and wait for admin to pay it to you.",
      );
    }
  }

  // Stores the worker's bank details so the agent knows where to send a bank-transfer payout.
  async setWorkerBankDetails(
    agentUserId: string,
    workerId: string,
    data: { accountHolderName: string; accountNumber: string; ifscCode: string; bankName: string },
  ): Promise<AgentWorkerRosterEntry> {
    const agent = await this.getAgentByUserId(agentUserId);
    await this.getAgentWorkerLink(agent.id, workerId);
    return this.agentWorkerRepo.setWorkerBankDetails(workerId, data);
  }

  // Assign a roster worker to a job application the provider has accepted.
  async assignWorkerToApplication(agentUserId: string, applicationId: string, workerId: string): Promise<any> {
    this.log('Agent assigning worker to application', { agentUserId, applicationId, workerId });
    const agent = await this.getAgentByUserId(agentUserId);
    await this.getAgentWorkerLink(agent.id, workerId);

    return this.applicationService.assignWorkerToApplication(agent.id, applicationId, workerId);
  }

  // Ownership check: finds the agent<->worker link or throws. Without this an agent could
  // act on another agency's workers just by guessing an id.
  private async getAgentWorkerLink(agentId: string, workerId: string) {
    const link = await this.agentWorkerRepo.findLinkByAgentAndWorker(agentId, workerId);
    if (!link) {
      throw new NotFoundException('AgentWorker', workerId);
    }
    return link;
  }

  // Adds a new worker to the roster. Creates a real worker account for them (no phone or
  // login needed) because the agent will operate it on their behalf.
  async createManagedWorker(agentUserId: string, data: CreateManagedWorkerInput): Promise<AgentWorkerRosterEntry> {
    this.log('Creating agent-managed worker', { agentUserId, name: data.name });
    const agent = await this.getAgentByUserId(agentUserId);
    return this.agentWorkerRepo.createManagedWorker(agent.id, data);
  }

  // The agent's whole roster with skills, availability and verified flag.
  async listMyWorkers(agentUserId: string): Promise<AgentWorkerRosterEntry[]> {
    this.log('Listing agent worker roster', { agentUserId });
    const agent = await this.getAgentByUserId(agentUserId);
    return this.agentWorkerRepo.findManyByAgentId(agent.id);
  }

  // Marks a worker available/unavailable for the day. This is how a worker who is standing in
  // front of the agent says "I can work today".
  async setWorkerAvailability(
    agentUserId: string,
    workerId: string,
    isAvailable: boolean,
    location?: { latitude: number; longitude: number },
  ): Promise<void> {
    this.log('Agent setting worker availability', { agentUserId, workerId, isAvailable });
    const agent = await this.getAgentByUserId(agentUserId);
    const link = await this.getAgentWorkerLink(agent.id, workerId);

    // These workers have no phone GPS, so the agent gives an approximate location instead.
    // We reuse the normal location/availability services, which also keep the Redis GEO index
    // in sync - so these workers get matched exactly like self-managed ones.
    if (location) {
      await this.locationService.updateLocation(link.worker.userId, location);
    }
    await this.workerService.updateAvailability(link.worker.userId, isAvailable);
  }

  // The agent's own "I vouch for this worker" flag. It is separate from the admin's platform-wide verification.
  async setWorkerVerified(agentUserId: string, workerId: string, verified: boolean): Promise<AgentWorkerRosterEntry> {
    this.log('Agent setting worker trust flag', { agentUserId, workerId, verified });
    const agent = await this.getAgentByUserId(agentUserId);
    await this.getAgentWorkerLink(agent.id, workerId);
    return this.agentWorkerRepo.setVerified(agent.id, workerId, verified);
  }

  // Removes the worker from the roster and deactivates their account.
  async removeWorker(agentUserId: string, workerId: string): Promise<void> {
    this.log('Agent removing worker from roster', { agentUserId, workerId });
    const agent = await this.getAgentByUserId(agentUserId);
    const link = await this.getAgentWorkerLink(agent.id, workerId);

    await this.userService.deleteAccount(link.worker.userId);
    await this.agentWorkerRepo.deleteLink(agent.id, workerId);
  }

  // Commission % comes from the admin-editable platform setting, cached for a minute so the
  // dashboard doesn't hit the DB on every load. Falls back to the default if unset.
  private async getAgentCommissionPercent(): Promise<number> {
    return this.getPercentSetting('agentCommissionPercent', DEFAULT_AGENT_COMMISSION_PERCENT);
  }

  private async getPercentSetting(key: string, fallback: number): Promise<number> {
    const cacheKey = CacheKeys.platformSetting(key);
    const cached = await this.cache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const setting = await this.platformSettingRepo.get(key);
    const percent = setting && setting.value ? Number(setting.value) : fallback;

    await this.cache.set(cacheKey, percent, 60);
    return percent;
  }

  // Maps the logged-in user to their AgentProfile (404 if they never created one).
  private async getAgentByUserId(userId: string): Promise<AgentProfile> {
    const agent = await this.agentRepo.findByUserId(userId);
    if (!agent) {
      throw new NotFoundException('AgentProfile', userId);
    }
    return agent;
  }

  // One agency profile per user.
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

    // Only update the fields that were actually sent.
    return this.agentRepo.update(userId, {
      ...(data.agencyName !== undefined && { agencyName: data.agencyName }),
      ...(data.description !== undefined && { description: data.description }),
    });
  }

  // The numbers on the agent's home screen. All counts are fetched in parallel.
  // "Active" means anything between booking creation and work started.
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

  // Every application the agency has sent, newest first, with job and provider info.
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

  // Every booking handled by this agency, newest first.
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

  // The agent's commission: a percentage of every settled booking they brought in.
  // Computed on the fly from bookings rather than stored, so changing the % in admin settings
  // applies to the whole history immediately.
  async getCommissionSummary(userId: string): Promise<any> {
    this.log('Calculating agent commission summary', { agentUserId: userId });
    const agent = await this.getAgentByUserId(userId);

    const [bookings, commissionPercent] = await Promise.all([
      this.agentRepo.findCommissionableBookings(agent.id),
      this.getAgentCommissionPercent(),
    ]);

    // The agent's cut was frozen on the booking when it was created. Rounded to paise.
    const commissions = bookings.map((b) => {
      const grossAmount = b.finalFare ?? b.amount;
      return {
        bookingId: b.id,
        grossAmount,
        commission: splitSettledBooking(b, true).agent,
        completedAt: b.completedAt,
        // Claimed = already requested from admin (or paid).
        checkedOut: b.commissionCheckedOutAt !== null || !!b.commissionRequestId,
      };
    });

    const totalGrossBookingValue = commissions.reduce((sum, c) => sum + c.grossAmount, 0);
    const totalEarnings = commissions.reduce((sum, c) => sum + c.commission, 0);
    // What can be cashed out right now. Bookings already checked out are skipped here, although
    // they still count toward the lifetime totalEarnings above.
    const pendingCheckoutAmount =
      Math.round(commissions.filter((c) => !c.checkedOut).reduce((sum, c) => sum + c.commission, 0) * 100) / 100;

    // The agent's fixed salary is not tracked in the app at all (the company pays that
    // outside). This is only the commission figure, split into today / this month / lifetime
    // for the dashboard.
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
      recentCommissions: commissions.slice(0, 20),
    };
  }
}
