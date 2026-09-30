import type { ICacheService } from "../../../core/interfaces/ICacheService.js";
import type { IDashboardRepository } from "../interfaces/IDashboardRepository.js";
import type { IDashboardService } from "../interfaces/IDashboardService.js";
import { NotFoundException } from "../../../core/exceptions/index.js";

export class DashboardService implements IDashboardService {
  constructor(
    private readonly dashboardRepo: IDashboardRepository,
    private readonly cache: ICacheService,
  ) {}

  async getWorkerDashboard(userId: string, range?: string, startDateStr?: string, endDateStr?: string) {
    const activeRange = range || "7days";
    const cacheKey = `dashboard:worker:${userId}:${activeRange}:${startDateStr || ""}:${endDateStr || ""}`;

    const cachedDashboard = await this.cache.get<any>(cacheKey);
    if (cachedDashboard) {
      return cachedDashboard;
    }

    const worker = await this.dashboardRepo.findWorkerProfile(userId);

    if (!worker) {
      throw new NotFoundException("WorkerProfile", userId);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let trendStart = new Date(today);
    trendStart.setDate(today.getDate() - 6);
    let trendEnd = new Date(today);
    trendEnd.setDate(today.getDate() + 1);

    if (activeRange === "1month") {
      trendStart = new Date(today);
      trendStart.setDate(today.getDate() - 29);
    } else if (activeRange === "custom" && startDateStr && endDateStr) {
      trendStart = new Date(startDateStr);
      trendStart.setHours(0, 0, 0, 0);
      trendEnd = new Date(endDateStr);
      trendEnd.setHours(23, 59, 59, 999);
    }

    const {
      todayEarnings,
      pendingBookings,
      completedBookings,
      currentBooking,
      upcomingBookings,
      recentReviews,
      trendBookings,
    } = await this.dashboardRepo.getWorkerDashboardData(worker.id, today, trendStart, trendEnd);

    const earningsTrend = [];
    const diffTime = Math.abs(trendEnd.getTime() - trendStart.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const daysToProcess = Math.min(diffDays, 100);

    for (let i = 0; i < daysToProcess; i++) {
      const current = new Date(trendStart);
      current.setDate(trendStart.getDate() + i);
      current.setHours(0, 0, 0, 0);

      const next = new Date(current);
      next.setDate(current.getDate() + 1);

      const total = trendBookings
        .filter((booking) => booking.completedAt && booking.completedAt >= current && booking.completedAt < next)
        .reduce((sum, booking) => sum + Number(booking.amount), 0);

      earningsTrend.push({
        label: current.toLocaleDateString("en-IN", {
          month: "numeric",
          day: "numeric",
          ...(activeRange === "7days" ? { weekday: "short" } : {}),
        }),
        value: total,
      });
    }

    const dashboard = {
      todaysEarnings: todayEarnings._sum?.amount ? Number(todayEarnings._sum.amount) : 0,
      completedJobs: completedBookings,
      pendingRequests: pendingBookings,
      rating: worker.rating,
      currentBooking: currentBooking
        ? {
            id: currentBooking.id,
            amount: currentBooking.amount,
            status: currentBooking.status,
            createdAt: currentBooking.createdAt,
            startedAt: currentBooking.startedAt ?? undefined,
            completedAt: currentBooking.completedAt ?? undefined,
            job: currentBooking.job
              ? {
                  id: currentBooking.job.id,
                  title: currentBooking.job.title,
                  description: currentBooking.job.description ?? undefined,
                  address: currentBooking.job.address ?? undefined,
                  city: currentBooking.job.city ?? undefined,
                  state: currentBooking.job.state ?? undefined,
                  pincode: currentBooking.job.pincode ?? undefined,
                  budget: currentBooking.job.budget ?? undefined,
                  latitude: currentBooking.job.latitude ?? undefined,
                  longitude: currentBooking.job.longitude ?? undefined,
                  skill: currentBooking.job.skill ?? undefined,
                }
              : undefined,
            provider: currentBooking.provider
              ? {
                  id: currentBooking.provider.id,
                  name: currentBooking.provider.name,
                  phone: currentBooking.provider.phone ?? undefined,
                  profileImage: currentBooking.provider.profileImage ?? undefined,
                }
              : undefined,
          }
        : null,

      upcomingJobs: upcomingBookings
        .filter((b) => b.job)
        .map((b) => ({
          id: b.job!.id,
          title: b.job!.title,
          description: b.job!.description ?? undefined,
          budget: b.job!.budget ?? undefined,
          requiredWorkers: b.job!.requiredWorkers,
          latitude: b.job!.latitude ?? 0,
          longitude: b.job!.longitude ?? 0,
          address: b.job!.address ?? undefined,
          city: b.job!.city ?? undefined,
          state: b.job!.state ?? undefined,
          pincode: b.job!.pincode ?? undefined,
          status: b.job!.status,
          createdAt: b.job!.createdAt,
          skill: b.job!.skill ?? undefined,
          provider: b.job!.provider ?? undefined,
        })),

      recentReviews: recentReviews.map((r) => ({
        id: r.id,
        bookingId: r.bookingId,
        rating: r.rating,
        comment: r.comment ?? undefined,
        createdAt: r.createdAt,
        provider: r.provider ? { id: r.provider.id, name: r.provider.name } : undefined,
      })),

      earningsTrend,
    };

    await this.cache.set(cacheKey, dashboard, 60);

    return dashboard;
  }

  async getProviderDashboard(userId: string, range?: string, startDateStr?: string, endDateStr?: string) {
    const activeRange = range || "7days";
    const cacheKey = `dashboard:provider:${userId}:${activeRange}:${startDateStr || ""}:${endDateStr || ""}`;

    const cachedDashboard = await this.cache.get<any>(cacheKey);
    if (cachedDashboard) {
      return cachedDashboard;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    let trendStart = new Date(today);
    trendStart.setDate(today.getDate() - 6);
    let trendEnd = new Date(today);
    trendEnd.setDate(today.getDate() + 1);

    if (activeRange === "1month") {
      trendStart = new Date(today);
      trendStart.setDate(today.getDate() - 29);
    } else if (activeRange === "custom" && startDateStr && endDateStr) {
      trendStart = new Date(startDateStr);
      trendStart.setHours(0, 0, 0, 0);
      trendEnd = new Date(endDateStr);
      trendEnd.setHours(23, 59, 59, 999);
    }

    const {
      activeJobs,
      completedJobs,
      activeBookings,
      completedBookings,
      pendingApplications,
      todaySpent,
      weekSpent,
      monthSpent,
      totalWorkersHired,
      recentBookings,
      recentApplicants,
      trendBookings: analyticsBookings,
      activeInstantRequests,
      completedInstantRequests,
    } = await this.dashboardRepo.getProviderDashboardData(userId, today, weekStart, monthStart, trendStart, trendEnd);

    const analyticsTrend = [];
    const diffTime = Math.abs(trendEnd.getTime() - trendStart.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const daysToProcess = Math.min(diffDays, 100);

    for (let i = 0; i < daysToProcess; i++) {
      const current = new Date(trendStart);
      current.setDate(trendStart.getDate() + i);
      current.setHours(0, 0, 0, 0);

      const next = new Date(current);
      next.setDate(current.getDate() + 1);

      const total = analyticsBookings
        .filter((booking) => booking.completedAt && booking.completedAt >= current && booking.completedAt < next)
        .reduce((sum, booking) => sum + Number(booking.amount), 0);

      analyticsTrend.push({
        label: current.toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
          ...(activeRange === "7days" ? { weekday: "short" } : {}),
        }),
        value: total,
      });
    }

    const dashboard = {
      activeJobs: activeJobs + activeInstantRequests,
      completedJobs: completedJobs + completedInstantRequests,
      activeBookings,
      completedBookings,
      pendingApplications,
      workersHired: totalWorkersHired,
      todaySpent: todaySpent._sum?.amount ? Number(todaySpent._sum.amount) : 0,
      thisWeekSpent: weekSpent._sum?.amount ? Number(weekSpent._sum.amount) : 0,
      thisMonthSpent: monthSpent._sum?.amount ? Number(monthSpent._sum.amount) : 0,
      analyticsTrend,
      recentBookings,
      recentApplicants,
    };

    await this.cache.set(cacheKey, dashboard, 60);

    return dashboard;
  }
}
