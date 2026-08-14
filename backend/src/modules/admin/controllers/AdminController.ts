import type { Request, Response } from 'express';
import { BaseController } from '../../../core/base/BaseController.js';
import type { IAdminService } from '../interfaces/IAdminService.js';
import { UserMapper } from '../../users/mappers/User.mapper.js';
import { BookingMapper } from '../../bookings/mappers/Booking.mapper.js';
import { UserRole } from '../../../core/enums/Role.js';
import { BookingStatus, BookingType } from '@prisma/client';
import { z } from 'zod';

const GetUsersQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.string().optional().transform(val => val === undefined ? undefined : val === 'true'),
  isVerified: z.string().optional().transform(val => val === undefined ? undefined : val === 'true'),
  search: z.string().optional(),
});

const SuspendUserBodySchema = z.object({
  isActive: z.boolean(),
});

const GetBookingsQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
  status: z.nativeEnum(BookingStatus).optional(),
  providerId: z.string().uuid().optional(),
  workerId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  type: z.nativeEnum(BookingType).optional(),
});

const AssignWorkerBodySchema = z.object({
  workerId: z.string().uuid(),
});

const UpdateSettingSchema = z.object({
  value: z.any(),
});

const UpdateTemplateBodySchema = z.object({
  subject: z.string().optional().nullable(),
  body: z.string().min(1),
  variables: z.any().optional().nullable(),
});

const PaginationQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
});

export class AdminController extends BaseController {
  constructor(private readonly adminService: IAdminService) {
    super();
  }

  getDashboard = async (req: Request, res: Response): Promise<void> => {
    const stats = await this.adminService.getDashboardStats();
    this.ok(res, stats, 'Admin dashboard statistics retrieved successfully.');
  };

  getUsers = async (req: Request, res: Response): Promise<void> => {
    const dto = this.validate(GetUsersQuerySchema, req.query);
    const result = await this.adminService.getUsers(dto, dto.page, dto.limit);
    
    this.paginated(
      res,
      result.items.map(u => UserMapper.toDto(u)),
      result.total,
      result.page,
      result.limit,
      'Users retrieved successfully.',
    );
  };

  suspendUser = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const dto = this.validate(SuspendUserBodySchema, req.body);
    const updated = await this.adminService.suspendUser(id, dto.isActive);
    this.ok(res, UserMapper.toDto(updated), 'User activation status updated successfully.');
  };

  getBookings = async (req: Request, res: Response): Promise<void> => {
    const dto = this.validate(GetBookingsQuerySchema, req.query);
    const result = await this.adminService.getBookings(dto, dto.page, dto.limit);

    this.paginated(
      res,
      BookingMapper.toResponseList(result.items),
      result.total,
      result.page,
      result.limit,
      'Bookings retrieved successfully.',
    );
  };

  assignWorker = async (req: Request, res: Response): Promise<void> => {
    const bookingId = req.params.id as string;
    const dto = this.validate(AssignWorkerBodySchema, req.body);
    const admin = (req as any).user;
    
    const updated = await this.adminService.assignWorker(bookingId, dto.workerId, admin.userId);
    this.ok(res, BookingMapper.toResponse(updated), 'Worker manually assigned to booking successfully.');
  };

  getAllSettings = async (req: Request, res: Response): Promise<void> => {
    const settings = await this.adminService.getAllSettings();
    this.ok(res, settings, 'Platform settings retrieved successfully.');
  };

  updateSetting = async (req: Request, res: Response): Promise<void> => {
    const key = req.params.key as string;
    const dto = this.validate(UpdateSettingSchema, req.body);
    const setting = await this.adminService.updatePlatformSetting(key, dto.value);
    this.ok(res, setting, 'Platform setting updated successfully.');
  };

  getNotificationTemplates = async (req: Request, res: Response): Promise<void> => {
    const dto = this.validate(PaginationQuerySchema, req.query);
    const result = await this.adminService.getNotificationTemplates(dto.page, dto.limit);

    this.paginated(
      res,
      result.items,
      result.total,
      result.page,
      result.limit,
      'Notification templates retrieved successfully.',
    );
  };

  updateNotificationTemplate = async (req: Request, res: Response): Promise<void> => {
    const type = req.params.type as string;
    const channel = req.params.channel as string;
    const locale = req.params.locale as string;
    const dto = this.validate(UpdateTemplateBodySchema, req.body);
    
    const template = await this.adminService.updateNotificationTemplate(type, channel, locale, dto);
    this.ok(res, template, 'Notification template updated successfully.');
  };

  verifyWorker = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const updated = await this.adminService.verifyWorker(id);
    this.ok(res, UserMapper.toDto(updated), 'Worker profile verified successfully.');
  };
}
