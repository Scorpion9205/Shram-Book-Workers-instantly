export interface IJobService {
  createJob(userId: string, data: any): Promise<any>;
  getAllJobs(userId: string): Promise<any>;
  getJobById(jobId: string): Promise<any>;
  getProviderJobs(userId: string): Promise<any[]>;
}
