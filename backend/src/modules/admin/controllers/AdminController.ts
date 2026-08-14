import type { Request, Response } from 'express';
import { BaseController } from '../../../core/base/BaseController.js';
import type { IAdminService } from '../interfaces/IAdminService.js';
import { z } from 'zod';

const UpdateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

export class AdminController extends BaseController {
  constructor(private readonly adminService: IAdminService) {
    super();
  }

  getDashboard = async (req: Request, res: Response): Promise<void> => {
    const stats = await this.adminService.getDashboardStats();
    this.ok(res, stats, 'Admin dashboard statistics retrieved successfully.');
  };

  updateSetting = async (req: Request, res: Response): Promise<void> => {
    const dto = await this.validate(UpdateSettingSchema, req.body);
    const setting = await this.adminService.updatePlatformSetting(dto.key, dto.value);
    this.ok(res, setting, 'Platform setting updated successfully.');
  };
}
