export interface IDashboardService {
  getWorkerDashboard(userId: string, range?: string, startDateStr?: string, endDateStr?: string): Promise<any>;
  getProviderDashboard(userId: string, range?: string, startDateStr?: string, endDateStr?: string): Promise<any>;
}
