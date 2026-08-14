import type { Request, Response } from 'express';
import { BaseController } from '../../../core/base/BaseController.js';
import type { IAgentService } from '../interfaces/IAgentService.js';
import { createAgentProfileSchema, updateAgentProfileSchema } from '../validations/agent.validation.js';

export class AgentController extends BaseController {
  constructor(private readonly agentService: IAgentService) {
    super();
  }

  createProfile = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const dto = await this.validate(createAgentProfileSchema, req.body);
    const profile = await this.agentService.createProfile(user.userId, dto);
    this.created(res, profile, 'Agent profile created successfully.');
  };

  getMyProfile = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const profile = await this.agentService.getMyProfile(user.userId);
    this.ok(res, profile, 'Agent profile retrieved successfully.');
  };

  updateProfile = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const dto = await this.validate(updateAgentProfileSchema, req.body);
    const profile = await this.agentService.updateProfile(user.userId, dto);
    this.ok(res, profile, 'Agent profile updated successfully.');
  };

  getDashboard = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const dashboard = await this.agentService.getDashboard(user.userId);
    this.ok(res, dashboard, 'Agent dashboard retrieved successfully.');
  };

  getMyApplications = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const applications = await this.agentService.getMyApplications(user.userId);
    this.ok(res, applications, 'Agent applications retrieved successfully.');
  };

  getMyBookings = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const bookings = await this.agentService.getMyBookings(user.userId);
    this.ok(res, bookings, 'Agent bookings retrieved successfully.');
  };
}
