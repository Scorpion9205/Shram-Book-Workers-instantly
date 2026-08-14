export interface IApplicationService {
  applyForJob(userId: string, jobId: string, data: any): Promise<any>;
  getJobApplications(userId: string, jobId: string): Promise<any[]>;
  acceptApplication(userId: string, applicationId: string): Promise<any>;
  rejectApplication(userId: string, applicationId: string): Promise<any>;
  getMyApplications(userId: string): Promise<any[]>;
}
