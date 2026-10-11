export interface IApplicationService {
  applyForJob(userId: string, jobId: string, data: any, role?: 'WORKER' | 'AGENT'): Promise<any>;
  getJobApplications(userId: string, jobId: string): Promise<any[]>;
  acceptApplication(userId: string, applicationId: string, paymentMode?: string): Promise<any>;
  rejectApplication(userId: string, applicationId: string): Promise<any>;
  getMyApplications(userId: string): Promise<any[]>;
  assignWorkerToApplication(agentId: string, applicationId: string, workerId: string): Promise<any>;
}
