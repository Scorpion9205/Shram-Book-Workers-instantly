import type { User, Booking, PlatformSetting, NotificationTemplate } from '@prisma/client';
import type { PaginatedResult } from '../../../core/base/BaseRepository.js';
import type { UserFilter } from '../../users/interfaces/IUserRepository.js';
import type { BookingFilter } from '../../bookings/interfaces/IBookingRepository.js';

export interface IAdminService {
  getDashboardStats(): Promise<any>;
  getUsers(filter: UserFilter, page: number, limit: number): Promise<PaginatedResult<User>>;
  suspendUser(id: string, isActive: boolean): Promise<User>;
  getBookings(filter: BookingFilter, page: number, limit: number): Promise<PaginatedResult<Booking>>;
  assignWorker(bookingId: string, workerId: string, adminId: string): Promise<Booking>;
  getAllSettings(): Promise<PlatformSetting[]>;
  updatePlatformSetting(key: string, value: any): Promise<PlatformSetting>;
  getNotificationTemplates(page: number, limit: number): Promise<PaginatedResult<NotificationTemplate>>;
  updateNotificationTemplate(
    type: string,
    channel: string,
    locale: string,
    data: { subject?: string | null | undefined; body: string; variables?: any },
  ): Promise<NotificationTemplate>;
  verifyWorker(workerId: string): Promise<User>;
}
