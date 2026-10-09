import type { User, Booking, PlatformSetting, NotificationTemplate, PricingRule } from '@prisma/client';
import type { PaginatedResult } from '../../../core/base/BaseRepository.js';
import type { UserFilter } from '../../users/interfaces/IUserRepository.js';
import type { BookingFilter } from '../../bookings/interfaces/IBookingRepository.js';
import type { PricingRuleWithSkill } from '../../pricing-rules/interfaces/IPricingRuleRepository.js';

export interface IAdminService {
  getDashboardStats(): Promise<any>;
  getUsers(filter: UserFilter, page: number, limit: number): Promise<PaginatedResult<User>>;
  suspendUser(id: string, isActive: boolean): Promise<User>;
  getBookings(filter: BookingFilter, page: number, limit: number): Promise<PaginatedResult<Booking>>;
  assignWorker(bookingId: string, workerId: string, adminId: string): Promise<Booking>;
  getAllSettings(): Promise<PlatformSetting[]>;
  updatePlatformSetting(key: string, value: any): Promise<PlatformSetting>;
  getAllPricingRules(): Promise<PricingRuleWithSkill[]>;
  upsertPricingRule(skillId: string, minFare?: number, maxFare?: number): Promise<PricingRule>;
  getPlatformAnalytics(range?: string, startDateStr?: string, endDateStr?: string): Promise<any>;
  getNotificationTemplates(page: number, limit: number): Promise<PaginatedResult<NotificationTemplate>>;
  updateNotificationTemplate(
    type: string,
    channel: string,
    locale: string,
    data: { subject?: string | null | undefined; body: string; variables?: any },
  ): Promise<NotificationTemplate>;
  verifyWorker(workerId: string): Promise<User>;
}
