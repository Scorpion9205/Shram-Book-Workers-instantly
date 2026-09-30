export interface WorkerDashboardRawData {
  todayEarnings: { _sum: { amount: any } };
  pendingBookings: number;
  completedBookings: number;
  currentBooking: any;
  upcomingBookings: any[];
  recentReviews: any[];
  trendBookings: { amount: any; completedAt: Date | null }[];
}

export interface ProviderDashboardRawData {
  activeJobs: number;
  completedJobs: number;
  activeBookings: number;
  completedBookings: number;
  pendingApplications: number;
  todaySpent: { _sum: { amount: any } };
  weekSpent: { _sum: { amount: any } };
  monthSpent: { _sum: { amount: any } };
  totalWorkersHired: number;
  recentBookings: any[];
  recentApplicants: any[];
  trendBookings: { amount: any; completedAt: Date | null }[];
  activeInstantRequests: number;
  completedInstantRequests: number;
}

export interface IDashboardRepository {
  findWorkerProfile(userId: string): Promise<{ id: string; rating: number } | null>;
  getWorkerDashboardData(workerId: string, today: Date, trendStart: Date, trendEnd: Date): Promise<WorkerDashboardRawData>;
  getProviderDashboardData(
    providerId: string,
    today: Date,
    weekStart: Date,
    monthStart: Date,
    trendStart: Date,
    trendEnd: Date,
  ): Promise<ProviderDashboardRawData>;
}
