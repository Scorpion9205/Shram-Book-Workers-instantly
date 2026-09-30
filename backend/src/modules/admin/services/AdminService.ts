import { BookingStatus } from '@prisma/client';
import type { User, Booking, PlatformSetting, NotificationTemplate } from '@prisma/client';
import { BaseService } from '../../../core/base/BaseService.js';
import type { IAdminService } from '../interfaces/IAdminService.js';
import type { IUserRepository, UserFilter } from '../../users/interfaces/IUserRepository.js';
import type { IBookingRepository, BookingFilter } from '../../bookings/interfaces/IBookingRepository.js';
import type { IPlatformSettingRepository } from '../../platform-settings/interfaces/IPlatformSettingRepository.js';
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
  ) {
    super('AdminService');
  }

  async getDashboardStats(): Promise<any> {
    this.log('Fetching system-wide admin dashboard statistics');
    return await this.adminRepo.getDashboardCounts();
  }

  async getUsers(filter: UserFilter, page: number, limit: number): Promise<PaginatedResult<User>> {
    this.log('Listing users for administration overview', { filter, page, limit });
    return await this.userRepo.findManyByFilter(filter, page, limit);
  }

  async suspendUser(id: string, isActive: boolean): Promise<User> {
    this.log('Toggling user activation status', { id, isActive });
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException('User', id);
    }

    const updated = await this.userRepo.update(id, { isActive });

    // Invalidate refresh sessions in cache
    const cacheKey = CacheKeys.refreshToken(id);
    await this.cache.del(cacheKey);

    // Suspending a worker must also pull them out of the Redis geo-index — otherwise they
    // stay eligible for (and can keep accepting) instant-request/bidding broadcasts after
    // suspension, since the matching query alone doesn't check user.isActive.
    if (!isActive && user.role === UserRole.WORKER) {
      const workerWithSkills = await this.workerRepo.getProfileWithSkillsAndUser(id);
      if (workerWithSkills) {
        for (const item of workerWithSkills.skills) {
          await this.cache.geoRemove(`geo:instant-workers:${item.skillId}`, workerWithSkills.id);
        }
      }
    }

    return updated;
  }

  async getBookings(filter: BookingFilter, page: number, limit: number): Promise<PaginatedResult<Booking>> {
    this.log('Listing bookings for administration overview', { filter, page, limit });
    return await this.bookingRepo.findManyByFilter(filter, page, limit);
  }

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

    // Validate the transition is legal BEFORE writing workerId — otherwise a booking that
    // can't legally reach WORKER_ASSIGNED (e.g. already WORK_STARTED/CLOSED/CANCELLED) gets
    // its workerId overwritten and left corrupted even though this call ultimately fails.
    const allowedFromCurrent = VALID_TRANSITIONS[booking.status] ?? [];
    if (!allowedFromCurrent.includes(BookingStatus.WORKER_ASSIGNED)) {
      throw new BusinessException(
        'INVALID_BOOKING_TRANSITION',
        `Cannot assign a worker to booking ${bookingId} while it is ${booking.status}. Allowed transitions: [${allowedFromCurrent.join(', ')}]`,
      );
    }

    // Step 1: Update the booking workerId
    await this.bookingRepo.update(bookingId, { workerId });

    // Step 2: Transition state to WORKER_ASSIGNED
    return await this.bookingStateService.transition(bookingId, BookingStatus.WORKER_ASSIGNED, {
      changedBy: adminId,
      reason: 'Admin manually assigned worker',
    });
  }

  async getAllSettings(): Promise<PlatformSetting[]> {
    this.log('Fetching all platform settings');
    return await this.settingRepo.listAll();
  }

  async updatePlatformSetting(key: string, value: any): Promise<PlatformSetting> {
    this.log('Updating platform setting', { key, value });

    const setting = await this.settingRepo.set(key, value);

    const cacheKey = CacheKeys.platformSetting(key);
    await this.cache.del(cacheKey);

    return setting;
  }

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

    // Invalidate Redis template cache
    const cacheKey = `notification:template:${type}:${channel}:${locale}`;
    await this.cache.del(cacheKey);

    return template;
  }

  async verifyWorker(workerId: string): Promise<User> {
    this.log('Verifying worker profile', { workerId });
    const worker = await this.workerRepo.findById(workerId);
    if (!worker) {
      throw new NotFoundException('WorkerProfile', workerId);
    }

    // Update isVerified to true on the User record
    return await this.userRepo.update(worker.userId, { isVerified: true });
  }
}
