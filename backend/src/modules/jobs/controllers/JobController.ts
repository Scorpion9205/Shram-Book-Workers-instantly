import type { Request, Response } from 'express';
import { BaseController } from '../../../core/base/BaseController.js';
import type { IJobService } from '../interfaces/IJobService.js';
import type { IApplicationService } from '../interfaces/IApplicationService.js';
import { createJobSchema, applyJobSchema } from '../validations/job.validation.js';
import { BusinessException } from '../../../core/exceptions/index.js';

export class JobController extends BaseController {
  constructor(
    private readonly jobService: IJobService,
    private readonly applicationService: IApplicationService,
  ) {
    super();
  }

  createJob = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const dto = await this.validate(createJobSchema, req.body);
    const job = await this.jobService.createJob(user.userId, dto);
    this.created(res, job, 'Job created successfully');
  };

  getAllJobs = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const result = await this.jobService.getAllJobs(user.userId);
    this.ok(res, result.jobs, 'Jobs retrieved successfully');
  };

  getJobById = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const jobId = req.params.jobId as string;
    if (!jobId) {
      throw new BusinessException('INVALID_JOB_ID', 'Invalid job id');
    }
    const job = await this.jobService.getJobById(jobId, user.userId);
    this.ok(res, job, 'Job retrieved successfully');
  };

  applyForJob = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const jobId = req.params.jobId as string;
    if (!jobId) {
      throw new BusinessException('INVALID_JOB_ID', 'Invalid job id');
    }
    const dto = await this.validate(applyJobSchema, req.body);
    const application = await this.applicationService.applyForJob(user.userId, jobId, dto);
    this.created(res, application, 'Applied successfully');
  };

  getJobApplications = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const jobId = req.params.jobId as string;
    if (!jobId) {
      throw new BusinessException('INVALID_JOB_ID', 'Invalid job id');
    }
    const applications = await this.applicationService.getJobApplications(user.userId, jobId);
    this.ok(res, applications, 'Applications retrieved successfully');
  };

  acceptApplication = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const applicationId = req.params.applicationId as string;
    if (!applicationId) {
      throw new BusinessException('INVALID_APPLICATION_ID', 'Invalid application id');
    }
    const { paymentMode } = req.body;
    const result = await this.applicationService.acceptApplication(user.userId, applicationId, paymentMode);
    this.ok(res, result, 'Application accepted successfully');
  };

  rejectApplication = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const applicationId = req.params.applicationId as string;
    if (!applicationId) {
      throw new BusinessException('INVALID_APPLICATION_ID', 'Invalid application id');
    }
    const result = await this.applicationService.rejectApplication(user.userId, applicationId);
    this.ok(res, result, 'Application rejected successfully');
  };

  getMyApplications = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const applications = await this.applicationService.getMyApplications(user.userId);
    this.ok(res, applications, 'Applications retrieved successfully');
  };

  getProviderJobs = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const jobs = await this.jobService.getProviderJobs(user.userId);
    this.ok(res, jobs, 'Provider jobs retrieved successfully');
  };
}
