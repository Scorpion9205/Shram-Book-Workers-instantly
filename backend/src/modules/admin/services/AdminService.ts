import { BookingStatus } from '@prisma/client';
import type { User, Booking, PlatformSetting, NotificationTemplate, PricingRule } from '@prisma/client';
import { BaseService } from '../../../core/base/BaseService.js';
import type { IAdminService } from '../interfaces/IAdminService.js';
import type { IUserRepository, UserFilter } from '../../users/interfaces/IUserRepository.js';
import type { IBookingRepository, BookingFilter } from '../../bookings/interfaces/IBookingRepository.js';
import type { IPlatformSettingRepository } from '../../platform-settings/interfaces/IPlatformSettingRepository.js';
import type { IPricingRuleRepository, PricingRuleWithSkill } from '../../pricing-rules/interfaces/IPricingRuleRepository.js';
import type { INotificationTemplateRepository } from '../../notifications/interfaces/INotificationTemplateRepository.js';
import type { IWorkerRepository } from '../../workers/interfaces/IWorkerRepository.js';
import type { IBookingStateService } from '../../bookings/interfaces/IBookingStateService.js';
import type { ICacheService } from '../../../core/interfaces/ICacheService.js';
import type { IAdminRepository } from '../interfaces/IAdminRepository.js';
import { CacheKeys } from '../../../infrastructure/cache/cacheKeys.js';
import type { PaginatedResult } from '../../../core/base/BaseRepository.js';
import { NotFoundException, BusinessException } from '../../../core/exceptions/index.js';
import { VALID_TRANSITIONS } from '../../bookings/constants/booking-transitions.constants.js';
import { UserRole } from '../../../core/enums/Role.js';
import { env } from '../../../config/env.js';
import { parseDurationToSeconds } from '../../../shared/utils/duration.util.js';

// Settings that must be validated before saving. A silly value (say a commission of 150%)
// would make fare calculation go negative for everyone, so these keys are range-checked.
// Any key not listed here is saved as-is.
const PERCENT_SETTING_KEYS = new Set(['commissionPercent', 'agentCommissionPercent']);
const POSITIVE_NUMBER_SETTING_KEYS = new Set([
  'distanceRatePerKm',
  'weatherMultiplier',
  'surgeMultiplier',
  'highDemandThreshold',
  'surgeFlatFee',
]);

// Throws a BusinessException if `value` isn't acceptable for this setting key.
function validatePlatformSettingValue(key: string, value: unknown): void {
  // Percentages: a finite number from 0 to 100.
  if (PERCENT_SETTING_KEYS.has(key)) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
      throw new BusinessException('INVALID_SETTING_VALUE', `"${key}" must be a number between 0 and 100`);
    }
    return;
  }

  // Rates and multipliers: any finite number that isn't negative.
  if (POSITIVE_NUMBER_SETTING_KEYS.has(key)) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new BusinessException('INVALID_SETTING_VALUE', `"${key}" must be a non-negative number`);
    }
    return;
  }

  // The search-radius steps used when matching instant requests (e.g. [2, 5, 10] km).
  // They must be positive and strictly increasing so the search always widens.
  if (key === 'instantRequestRadiusTiers') {
    const isAscendingPositiveArray =
      Array.isArray(value) &&
      value.length > 0 &&
      value.every((v) => typeof v === 'number' && Number.isFinite(v) && v > 0) &&
      value.every((v, i) => i === 0 || v > value[i - 1]);
    if (!isAscendingPositiveArray) {
      throw new BusinessException('INVALID_SETTING_VALUE', `"${key}" must be an array of strictly ascending positive numbers`);
    }
  }
}

/**
 * Back-office operations for administrators: platform stats and analytics, user management,
 * booking overview, and the editable configuration (settings, pricing rules, message templates).
 */
export class AdminService extends BaseService implements IAdminService {
  constructor(
    private readonly adminRepo: IAdminRepository,
    private readonly cache: ICacheService,
    private readonly userRepo: IUserRepository,
    private readonly bookingRepo: IBookingRepository,
    private readonly settingRepo: IPlatformSettingRepository,
    private readonly notificationTemplateRepo: INotificationTemplateRepository,
    private readonly workerRepo: IWorkerRepository,
    private readonly bookingStateService: IBookingStateService,
    private readonly pricingRuleRepo: IPricingRuleRepository,
  ) {
    super('AdminService');
  }

  // Headline counters for the admin home page.
  async getDashboardStats(): Promise<any> {
    this.log('Fetching system-wide admin dashboard statistics');
    return await this.adminRepo.getDashboardCounts();
  }

  // Analytics page: counters plus day-by-day signup/booking/revenue trends.
  // `range` is '7days' (default), '1month' or 'custom' (needs start and end dates).
  async getPlatformAnalytics(range?: string, startDateStr?: string, endDateStr?: string): Promise<any> {
    this.log('Fetching platform-wide analytics', { range });

    const activeRange = range || '7days';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let trendStart = new Date(today);
    trendStart.setDate(today.getDate() - 6);
    let trendEnd = new Date(today);
    trendEnd.setDate(today.getDate() + 1);

    if (activeRange === '1month') {
      trendStart = new Date(today);
      trendStart.setDate(today.getDate() - 29);
    } else if (activeRange === 'custom' && startDateStr && endDateStr) {
      trendStart = new Date(startDateStr);
      trendStart.setHours(0, 0, 0, 0);
      trendEnd = new Date(endDateStr);
      trendEnd.setHours(23, 59, 59, 999);
    }

    const [counts, analytics] = await Promise.all([
      this.adminRepo.getDashboardCounts(),
      this.adminRepo.getPlatformAnalyticsData(trendStart, trendEnd),
    ]);

    // Number of day-buckets for the charts, capped at 100 so a huge custom range can't blow up the response.
    const diffDays = Math.min(
      Math.ceil(Math.abs(trendEnd.getTime() - trendStart.getTime()) / (1000 * 60 * 60 * 24)),
      100,
    );

    const signupTrend: { label: string; value: number }[] = [];
    const bookingTrend: { label: string; value: number }[] = [];
    const revenueTrend: { label: string; value: number }[] = [];

    // One bucket per day: [current, next) is that day's midnight-to-midnight window.
    for (let i = 0; i < diffDays; i++) {
      const current = new Date(trendStart);
      current.setDate(trendStart.getDate() + i);
      current.setHours(0, 0, 0, 0);
      const next = new Date(current);
      next.setDate(current.getDate() + 1);

      const label = current.toLocaleDateString('en-IN', {
        month: 'numeric',
        day: 'numeric',
        ...(activeRange === '7days' ? { weekday: 'short' } : {}),
      });

      signupTrend.push({
        label,
        value: analytics.signups.filter((s) => s.createdAt >= current && s.createdAt < next).length,
      });
      bookingTrend.push({
        label,
        value: analytics.bookings.filter((b) => b.createdAt >= current && b.createdAt < next).length,
      });
      revenueTrend.push({
        label,
        value: analytics.revenueEntries
          .filter((r) => r.createdAt >= current && r.createdAt < next)
          .reduce((sum, r) => sum + r.amount, 0),
      });
    }

    return {
      ...counts,
      activeWorkers: analytics.activeWorkers,
      activeProviders: analytics.activeProviders,
      totalRevenue: analytics.totalRevenue,
      signupTrend,
      bookingTrend,
      revenueTrend,
    };
  }

  // Paginated, filterable user list for the Users page.
  async getUsers(filter: UserFilter, page: number, limit: number): Promise<PaginatedResult<User>> {
    this.log('Listing users for administration overview', { filter, page, limit });
    return await this.userRepo.findManyByFilter(filter, page, limit);
  }

  // Suspend (isActive=false) or re-activate a user. Suspension is meant to bite right away,
  // which takes a few extra steps - see the comments below.
  async suspendUser(id: string, isActive: boolean): Promise<User> {
    this.log('Toggling user activation status', { id, isActive });
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException('User', id);
    }

    const updated = await this.userRepo.update(id, { isActive });

    // Kill their refresh token so they can't get a new access token.
    const cacheKey = CacheKeys.refreshToken(id);
    await this.cache.del(cacheKey);

    // An access token that's already been issued would keep working for up to 15 minutes.
    // So we also set a "revoked" marker that the auth middleware checks on every request,
    // which makes the suspension take effect immediately.
    if (!isActive) {
      const revokeTtl = parseDurationToSeconds(env.JWT_ACCESS_EXPIRY, 15 * 60);
      await this.cache.set(CacheKeys.revokedUser(id), true, revokeTtl);
    }

    // A suspended worker also has to leave the Redis GEO index, otherwise instant-request
    // matching (which doesn't look at isActive) would keep offering them jobs.
    if (!isActive && user.role === UserRole.WORKER) {
      const workerWithSkills = await this.workerRepo.getOrCreateProfileWithSkillsAndUser(id);
      if (workerWithSkills) {
        for (const item of workerWithSkills.skills) {
          await this.cache.geoRemove(`geo:instant-workers:${item.skillId}`, workerWithSkills.id);
        }
      }
    }

    return updated;
  }

  // All bookings on the platform, for the admin Bookings page.
  async getBookings(filter: BookingFilter, page: number, limit: number): Promise<PaginatedResult<Booking>> {
    this.log('Listing bookings for administration overview', { filter, page, limit });
    return await this.bookingRepo.findManyByFilter(filter, page, limit);
  }

  // Admin override: put a specific worker on a booking by hand (e.g. when matching failed).
  async assignWorker(bookingId: string, workerId: string, adminId: string): Promise<Booking> {
    this.log('Admin manually assigning worker to booking', { bookingId, workerId, adminId });
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking', bookingId);
    }

    const worker = await this.workerRepo.findById(workerId);
    if (!worker) {
      throw new NotFoundException('WorkerProfile', workerId);
    }

    // Check the status change is legal first. If we wrote workerId before checking, a booking
    // that's already started or closed would get its worker overwritten even though the call fails.
    const allowedFromCurrent = VALID_TRANSITIONS[booking.status] ?? [];
    if (!allowedFromCurrent.includes(BookingStatus.WORKER_ASSIGNED)) {
      throw new BusinessException(
        'INVALID_BOOKING_TRANSITION',
        `Cannot assign a worker to booking ${bookingId} while it is ${booking.status}. Allowed transitions: [${allowedFromCurrent.join(', ')}]`,
      );
    }

    // Mark the worker busy in one step so they can't be double-booked, even if another
    // flow (apply/accept, instant request) grabbed them a moment ago.
    const claimed = await this.workerRepo.markUnavailableIfAvailable(workerId);
    if (claimed === 0) {
      throw new BusinessException('WORKER_UNAVAILABLE', 'This worker is already assigned to another active booking');
    }

    // First attach the worker, then move the booking to WORKER_ASSIGNED through the state machine.
    await this.bookingRepo.update(bookingId, { workerId });
    return await this.bookingStateService.transition(bookingId, BookingStatus.WORKER_ASSIGNED, {
      changedBy: adminId,
      reason: 'Admin manually assigned worker',
    });
  }

  // Every editable platform setting (commission %, surge multipliers, radius tiers, ...).
  async getAllSettings(): Promise<PlatformSetting[]> {
    this.log('Fetching all platform settings');
    return await this.settingRepo.listAll();
  }

  // Validates and saves one setting, then clears its cache entry so the new value is used straight away.
  async updatePlatformSetting(key: string, value: any): Promise<PlatformSetting> {
    this.log('Updating platform setting', { key, value });

    validatePlatformSettingValue(key, value);

    const setting = await this.settingRepo.set(key, value);

    const cacheKey = CacheKeys.platformSetting(key);
    await this.cache.del(cacheKey);

    return setting;
  }

  // Per-skill minimum/maximum fare limits.
  async getAllPricingRules(): Promise<PricingRuleWithSkill[]> {
    this.log('Fetching all pricing rules');
    return await this.pricingRuleRepo.findAll();
  }

  async upsertPricingRule(skillId: string, minFare?: number, maxFare?: number): Promise<PricingRule> {
    this.log('Upserting pricing rule', { skillId, minFare, maxFare });

    // Check min <= max using the combined result (new values merged with what's already stored).
    // Sending only a new minFare that is above the existing maxFare is just as wrong as sending
    // both values in the wrong order.
    const existing = await this.pricingRuleRepo.findBySkillId(skillId);
    const finalMinFare = minFare !== undefined ? minFare : existing?.minFare !== null ? Number(existing?.minFare) : undefined;
    const finalMaxFare = maxFare !== undefined ? maxFare : existing?.maxFare !== null ? Number(existing?.maxFare) : undefined;
    if (finalMinFare !== undefined && finalMaxFare !== undefined && finalMinFare > finalMaxFare) {
      throw new BusinessException('INVALID_PRICING_RULE', 'minFare cannot be greater than maxFare');
    }

    return await this.pricingRuleRepo.upsert(skillId, {
      ...(minFare !== undefined && { minFare }),
      ...(maxFare !== undefined && { maxFare }),
    });
  }

  // The editable email/SMS/push message templates, paginated.
  async getNotificationTemplates(page: number, limit: number): Promise<PaginatedResult<NotificationTemplate>> {
    this.log('Listing notification templates', { page, limit });
    return await this.notificationTemplateRepo.findMany(page, limit);
  }

  async updateNotificationTemplate(
    type: string,
    channel: string,
    locale: string,
    data: { subject?: string | null | undefined; body: string; variables?: any },
  ): Promise<NotificationTemplate> {
    this.log('Upserting notification template', { type, channel, locale });

    const template = await this.notificationTemplateRepo.upsert(type, channel, locale, data);

    // Templates are cached for a few minutes; clear this one so the edit is used immediately.
    const cacheKey = `notification:template:${type}:${channel}:${locale}`;
    await this.cache.del(cacheKey);

    return template;
  }

  // Admin's platform-wide "this worker is verified" stamp.
  async verifyWorker(userId: string, isVerified: boolean): Promise<User> {
    this.log('Verifying worker profile', { userId, isVerified });
    // The Users page only knows the user id, not the worker-profile id, so look up by userId.
    const worker = await this.workerRepo.findByUserId(userId);
    if (!worker) {
      throw new NotFoundException('WorkerProfile', userId);
    }

    return await this.userRepo.update(worker.userId, { isVerified });
  }
}
