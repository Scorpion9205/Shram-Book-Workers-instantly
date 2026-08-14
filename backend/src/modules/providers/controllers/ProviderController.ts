import type { Request, Response } from 'express';
import { BaseController } from '../../../core/base/BaseController.js';
import type { IProviderService } from '../interfaces/IProviderService.js';
import {
  createProviderProfileSchema,
  updateProviderProfileSchema,
} from '../validations/provider.validation.js';

export class ProviderController extends BaseController {
  constructor(private readonly providerService: IProviderService) {
    super();
  }

  createProfile = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const dto = this.validate(createProviderProfileSchema, req.body);

    const profile = await this.providerService.createProfile(user.userId || user.id, dto);

    this.created(res, profile, 'Provider profile created successfully');
  };

  getMyProfile = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const profile = await this.providerService.getMyProfile(user.userId || user.id);

    this.ok(res, profile, 'Provider profile retrieved successfully');
  };

  updateProfile = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const dto = this.validate(updateProviderProfileSchema, req.body);

    const profile = await this.providerService.updateProfile(user.userId || user.id, dto);

    this.ok(res, profile, 'Provider profile updated successfully');
  };
}
