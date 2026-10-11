import type { Request, Response } from 'express';
import { BaseController } from '../../../core/base/BaseController.js';
import type { IAgentService } from '../interfaces/IAgentService.js';
import { BusinessException } from '../../../core/exceptions/index.js';
import {
  createAgentProfileSchema,
  updateAgentProfileSchema,
  createManagedWorkerSchema,
  setWorkerAvailabilitySchema,
  setWorkerVerifiedSchema,
  setWorkerBankDetailsSchema,
  payoutWorkerSchema,
  assignWorkerSchema,
} from '../validations/agent.validation.js';

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

  getCommissionSummary = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const summary = await this.agentService.getCommissionSummary(user.userId);
    this.ok(res, summary, 'Agent commission summary retrieved successfully.');
  };

  createWorker = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const dto = await this.validate(createManagedWorkerSchema, req.body);
    const worker = await this.agentService.createManagedWorker(user.userId, dto);
    this.created(res, worker, 'Worker added to your roster successfully.');
  };

  listWorkers = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const workers = await this.agentService.listMyWorkers(user.userId);
    this.ok(res, workers, 'Worker roster retrieved successfully.');
  };

  setWorkerAvailability = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const workerId = req.params.workerId as string;
    if (!workerId) {
      throw new BusinessException('INVALID_WORKER_ID', 'Invalid worker id');
    }
    const dto = await this.validate(setWorkerAvailabilitySchema, req.body);
    const location = dto.latitude !== undefined && dto.longitude !== undefined
      ? { latitude: dto.latitude, longitude: dto.longitude }
      : undefined;
    await this.agentService.setWorkerAvailability(user.userId, workerId, dto.isAvailable, location);
    this.ok(res, null, 'Worker availability updated successfully.');
  };

  setWorkerVerified = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const workerId = req.params.workerId as string;
    if (!workerId) {
      throw new BusinessException('INVALID_WORKER_ID', 'Invalid worker id');
    }
    const dto = await this.validate(setWorkerVerifiedSchema, req.body);
    const worker = await this.agentService.setWorkerVerified(user.userId, workerId, dto.verified);
    this.ok(res, worker, 'Worker verification status updated successfully.');
  };

  removeWorker = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const workerId = req.params.workerId as string;
    if (!workerId) {
      throw new BusinessException('INVALID_WORKER_ID', 'Invalid worker id');
    }
    await this.agentService.removeWorker(user.userId, workerId);
    this.noContent(res);
  };

  getWorkerEarnings = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const workerId = req.params.workerId as string;
    if (!workerId) {
      throw new BusinessException('INVALID_WORKER_ID', 'Invalid worker id');
    }
    const summary = await this.agentService.getWorkerEarnings(user.userId, workerId);
    this.ok(res, summary, 'Worker earnings retrieved successfully.');
  };

  payoutWorker = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const workerId = req.params.workerId as string;
    if (!workerId) {
      throw new BusinessException('INVALID_WORKER_ID', 'Invalid worker id');
    }
    const dto = await this.validate(payoutWorkerSchema, req.body);
    await this.agentService.payoutWorker(user.userId, workerId, dto.method);
    this.ok(res, null, 'Worker marked as paid.');
  };

  setWorkerBankDetails = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const workerId = req.params.workerId as string;
    if (!workerId) {
      throw new BusinessException('INVALID_WORKER_ID', 'Invalid worker id');
    }
    const dto = await this.validate(setWorkerBankDetailsSchema, req.body);
    const worker = await this.agentService.setWorkerBankDetails(user.userId, workerId, dto);
    this.ok(res, worker, 'Worker bank details updated successfully.');
  };

  assignWorker = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const applicationId = req.params.applicationId as string;
    if (!applicationId) {
      throw new BusinessException('INVALID_APPLICATION_ID', 'Invalid application id');
    }
    const dto = await this.validate(assignWorkerSchema, req.body);
    const result = await this.agentService.assignWorkerToApplication(user.userId, applicationId, dto.workerId);
    this.created(res, result, 'Worker assigned to the application successfully.');
  };

  getOpenInstantRequests = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const requests = await this.agentService.getOpenInstantRequests(user.userId);
    this.ok(res, requests, 'Open instant requests retrieved successfully.');
  };

  assignWorkerToInstantItem = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const itemId = req.params.itemId as string;
    if (!itemId) {
      throw new BusinessException('INVALID_ITEM_ID', 'Invalid instant request item id');
    }
    const dto = await this.validate(assignWorkerSchema, req.body);
    const result = await this.agentService.assignWorkerToInstantItem(user.userId, itemId, dto.workerId);
    this.created(res, result, 'Worker assigned to the instant request successfully.');
  };

  checkoutCommission = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const result = await this.agentService.checkoutCommission(user.userId);
    this.ok(res, result, `₹${result.checkedOutAmount} commission checked out successfully.`);
  };
}
