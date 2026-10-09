export interface DashboardCounts {
  totalUsers: number;
  totalWorkers: number;
  totalProviders: number;
  totalAgents: number;
  totalBookings: number;
  totalJobs: number;
}

export interface PlatformAnalyticsRawData {
  activeWorkers: number;
  activeProviders: number;
  totalRevenue: number;
  signups: { createdAt: Date }[];
  bookings: { createdAt: Date }[];
  revenueEntries: { createdAt: Date; amount: number }[];
}

export interface IAdminRepository {
  getDashboardCounts(): Promise<DashboardCounts>;
  getPlatformAnalyticsData(trendStart: Date, trendEnd: Date): Promise<PlatformAnalyticsRawData>;
}
