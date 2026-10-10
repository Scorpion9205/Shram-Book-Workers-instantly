import type { JobListFilter } from './IJobRepository.js';

export interface IJobService {
  createJob(userId: string, data: any): Promise<any>;
  getAllJobs(userId: string, filter?: JobListFilter): Promise<any>;
  getJobById(jobId: string, userId?: string): Promise<any>;
  getProviderJobs(userId: string): Promise<any[]>;
}
