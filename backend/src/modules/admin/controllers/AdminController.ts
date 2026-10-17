import type { Request, Response } from 'express';
import { BaseController } from '../../../core/base/BaseController.js';
import type { IAdminService } from '../interfaces/IAdminService.js';
import { UserMapper } from '../../users/mappers/User.mapper.js';
import { BookingMapper } from '../../bookings/mappers/Booking.mapper.js';
import { UserRole } from '../../../core/enums/Role.js';
import { BookingStatus, BookingType } from '@prisma/client';
import { z } from 'zod';

// Pagination query params, made safe: page falls back to 1 for anything invalid, and limit
// falls back to 10 and is capped at 100. This stops things like ?limit=5000000 from running a
// huge query, and ?page=0 from producing a negative offset.
const pageSchema = z.string().optional().transform(val => {
  const parsed = val ? parseInt(val, 10) : 1;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
});
const limitSchema = z.string().optional().transform(val => {
  const parsed = val ? parseInt(val, 10) : 10;
  if (!Number.isFinite(parsed) || parsed <= 0) return 10;
  return Math.min(parsed, 100);
});

// Query string for the Users list. Booleans arrive as the text "true"/"false", so convert them.
const GetUsersQuerySchema = z.object({
  page: pageSchema,
  limit: limitSchema,
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.string().optional().transform(val => val === undefined ? undefined : val === 'true'),
  isVerified: z.string().optional().transform(val => val === undefined ? undefined : val === 'true'),
  search: z.string().optional(),
});

const SuspendUserBodySchema = z.object({
  isActive: z.boolean(),
});

const VerifyWorkerBodySchema = z.object({
  isVerified: z.boolean(),
});

const GetBookingsQuerySchema = z.object({
  page: pageSchema,
  limit: limitSchema,
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

const UpdateSkillBaseRateBodySchema = z.object({
  baseRate: z.number().positive().max(1000000),
});

const UpsertPricingRuleBodySchema = z
  .object({
    minFare: z.number().nonnegative().optional(),
    maxFare: z.number().nonnegative().optional(),
  })
  .refine(
    (data) => data.minFare === undefined || data.maxFare === undefined || data.minFare <= data.maxFare,
    { message: 'minFare cannot be greater than maxFare', path: ['minFare'] },
  );

const UpdateTemplateBodySchema = z.object({
  subject: z.string().optional().nullable(),
  body: z.string().min(1),
  variables: z.any().optional().nullable(),
});

const PaginationQuerySchema = z.object({
  page: pageSchema,
  limit: limitSchema,
});

export class AdminController extends BaseController {
  constructor(private readonly adminService: IAdminService) {
    super();
  }

  getDashboard = async (req: Request, res: Response): Promise<void> => {
    const stats = await this.adminService.getDashboardStats();
    this.ok(res, stats, 'Admin dashboard statistics retrieved successfully.');
  };

  getPlatformAnalytics = async (req: Request, res: Response): Promise<void> => {
    const { range, startDate, endDate } = req.query;
    const analytics = await this.adminService.getPlatformAnalytics(
      range as string,
      startDate as string,
      endDate as string,
    );
    this.ok(res, analytics, 'Platform analytics retrieved successfully.');
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

  getSkillRates = async (_req: Request, res: Response): Promise<void> => {
    const skills = await this.adminService.getSkillRates();
    this.ok(res, { skills }, 'Skill rates retrieved successfully.');
  };

  updateSkillBaseRate = async (req: Request, res: Response): Promise<void> => {
    const skillId = req.params.skillId as string;
    const dto = this.validate(UpdateSkillBaseRateBodySchema, req.body);
    const skill = await this.adminService.updateSkillBaseRate(skillId, dto.baseRate);
    this.ok(res, { skill }, 'Skill base rate updated successfully.');
  };

  getAllPricingRules = async (req: Request, res: Response): Promise<void> => {
    const rules = await this.adminService.getAllPricingRules();
    this.ok(res, { rules }, 'Pricing rules retrieved successfully.');
  };

  upsertPricingRule = async (req: Request, res: Response): Promise<void> => {
    const skillId = req.params.skillId as string;
    const dto = this.validate(UpsertPricingRuleBodySchema, req.body);
    const rule = await this.adminService.upsertPricingRule(skillId, dto.minFare, dto.maxFare);
    this.ok(res, { rule }, 'Pricing rule updated successfully.');
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
    const dto = this.validate(VerifyWorkerBodySchema, req.body);
    const updated = await this.adminService.verifyWorker(id, dto.isVerified);
    this.ok(res, UserMapper.toDto(updated), dto.isVerified ? 'Worker profile verified successfully.' : 'Worker verification revoked.');
  };
}
