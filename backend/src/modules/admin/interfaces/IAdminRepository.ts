export interface DashboardCounts {
  totalUsers: number;
  totalWorkers: number;
  totalProviders: number;
  totalAgents: number;
  totalBookings: number;
  totalJobs: number;
}

export interface IAdminRepository {
  getDashboardCounts(): Promise<DashboardCounts>;
}
