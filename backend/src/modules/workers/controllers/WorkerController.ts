import type { Request, Response } from 'express';
import { BaseController } from '../../../core/base/BaseController.js';
import type { IWorkerService } from '../interfaces/IWorkerService.js';
import {
  createWorkerProfileSchema,
  updateAvailabilitySchema,
  updateWorkerProfileSchema,
} from '../validations/worker.validation.js';

export class WorkerController extends BaseController {
  constructor(private readonly workerService: IWorkerService) {
    super();
  }

  createProfile = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const dto = this.validate(createWorkerProfileSchema, req.body);

    const profile = await this.workerService.createProfile(user.userId || user.id, dto);

    this.created(res, profile, 'Worker profile created successfully');
  };

  getMyProfile = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const profile = await this.workerService.getMyProfile(user.userId || user.id);

    this.ok(res, profile, 'Worker profile retrieved successfully');
  };

  updateProfile = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const dto = this.validate(updateWorkerProfileSchema, req.body);

    const profile = await this.workerService.updateProfile(user.userId || user.id, dto);

    this.ok(res, profile, 'Worker profile updated successfully');
  };

  updateAvailability = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const dto = this.validate(updateAvailabilitySchema, req.body);

    const profile = await this.workerService.updateAvailability(
      user.userId || user.id,
      dto.isAvailable,
    );

    this.ok(res, profile, 'Worker availability status updated successfully');
  };
}
