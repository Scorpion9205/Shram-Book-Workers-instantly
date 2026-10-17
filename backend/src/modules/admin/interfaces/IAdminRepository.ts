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

export interface SkillRateRow {
  id: string;
  name: string;
  baseRate: number;
  rateUnit: string;
  category: string | null;
}

export interface IAdminRepository {
  listSkillRates(): Promise<SkillRateRow[]>;
  updateSkillBaseRate(skillId: string, baseRate: number): Promise<SkillRateRow | null>;
  getDashboardCounts(): Promise<DashboardCounts>;
  getPlatformAnalyticsData(trendStart: Date, trendEnd: Date): Promise<PlatformAnalyticsRawData>;
}
