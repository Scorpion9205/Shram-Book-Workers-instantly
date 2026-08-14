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
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { CacheKeys } from '../../../infrastructure/cache/cacheKeys.js';
import type { PaginatedResult } from '../../../core/base/BaseRepository.js';
import { NotFoundException } from '../../../core/exceptions/index.js';

export class AdminService extends BaseService implements IAdminService {
  constructor(
    private readonly prisma: PrismaService,
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
