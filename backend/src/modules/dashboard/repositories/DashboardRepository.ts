import { BookingStatus } from "@prisma/client";
import { PrismaService } from "../../../database/prisma/PrismaService.js";
import type {
  IDashboardRepository,
  WorkerDashboardRawData,
  ProviderDashboardRawData,
} from "../interfaces/IDashboardRepository.js";

export class DashboardRepository implements IDashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findWorkerProfile(userId: string) {
    return this.prisma.client.workerProfile.findUnique({ where: { userId } });
  }

  async getWorkerDashboardData(
    workerId: string,
    today: Date,
    trendStart: Date,
    trendEnd: Date,
  ): Promise<WorkerDashboardRawData> {
    const client = this.prisma.client;

    const [todayEarnings, pendingBookings, completedBookings, currentBooking, upcomingBookings, recentReviews, trendBookings] =
      await Promise.all([
        client.booking.aggregate({
          where: {
            workerId,
            status: BookingStatus.WORK_COMPLETED,
            completedAt: { gte: today },
          },
          _sum: { amount: true },
        }),

        client.booking.count({
          where: { workerId, status: BookingStatus.WORKER_ASSIGNED },
        }),

        client.booking.count({
          where: { workerId, status: BookingStatus.WORK_COMPLETED },
        }),

        // The booking currently in progress (if any) — shown as the
        // worker's "active job" card on the dashboard.
        client.booking.findFirst({
          where: { workerId, status: BookingStatus.WORK_STARTED },
          orderBy: { startedAt: "desc" },
          include: {
            job: { include: { skill: { select: { id: true, name: true } } } },
            provider: { select: { id: true, name: true, phone: true, profileImage: true } },
          },
        }),

        // Confirmed bookings not yet started — the worker's upcoming jobs.
        client.booking.findMany({
          where: { workerId, status: BookingStatus.WORKER_ASSIGNED, jobId: { not: null } },
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            job: {
              include: {
                skill: { select: { id: true, name: true } },
                provider: { select: { id: true, name: true } },
              },
            },
          },
        }),

        client.review.findMany({
          where: { workerId },
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { provider: { select: { id: true, name: true } } },
        }),

        // Daily completed earnings for the trend window, used to draw the
        // earnings trend sparkline on the dashboard.
        client.booking.findMany({
          where: {
            workerId,
            status: BookingStatus.WORK_COMPLETED,
            completedAt: { gte: trendStart, lte: trendEnd },
          },
          select: { amount: true, completedAt: true },
        }),
      ]);

    return {
      todayEarnings,
      pendingBookings,
      completedBookings,
      currentBooking,
      upcomingBookings,
      recentReviews,
      trendBookings,
    };
  }

  async getProviderDashboardData(
    providerId: string,
    today: Date,
    weekStart: Date,
    monthStart: Date,
    trendStart: Date,
    trendEnd: Date,
  ): Promise<ProviderDashboardRawData> {
    const client = this.prisma.client;

    const [
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
      trendBookings,
      activeInstantRequests,
      completedInstantRequests,
    ] = await Promise.all([
      client.job.count({
        where: { providerId, status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } },
      }),

      client.job.count({
        where: { providerId, status: "COMPLETED" },
      }),

      client.booking.count({
        where: {
          providerId,
          status: {
            in: [
              BookingStatus.WORKER_ASSIGNED,
              BookingStatus.WORKER_EN_ROUTE,
              BookingStatus.OTP_VERIFIED,
              BookingStatus.WORK_STARTED,
            ],
          },
        },
      }),

      client.booking.count({
        where: { providerId, status: BookingStatus.WORK_COMPLETED },
      }),

      client.application.count({
        where: { job: { providerId }, status: "PENDING" },
      }),

      client.booking.aggregate({
        where: { providerId, status: BookingStatus.WORK_COMPLETED, completedAt: { gte: today } },
        _sum: { amount: true },
      }),

      client.booking.aggregate({
        where: { providerId, status: BookingStatus.WORK_COMPLETED, completedAt: { gte: weekStart } },
        _sum: { amount: true },
      }),

      client.booking.aggregate({
        where: { providerId, status: BookingStatus.WORK_COMPLETED, completedAt: { gte: monthStart } },
        _sum: { amount: true },
      }),

      client.booking.count({
        where: { providerId, status: BookingStatus.WORK_COMPLETED },
      }),

      client.booking.findMany({
        where: { providerId },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          worker: {
            include: {
              user: { select: { id: true, name: true, phone: true, profileImage: true } },
            },
          },
          review: { select: { id: true, rating: true, comment: true } },
        },
      }),

      client.application.findMany({
        where: { job: { providerId } },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          job: { select: { id: true, title: true } },
          worker: {
            include: {
              user: { select: { id: true, name: true, phone: true, profileImage: true } },
            },
          },
          agent: {
            include: {
              user: { select: { id: true, name: true, phone: true, profileImage: true } },
            },
          },
        },
      }),

      client.booking.findMany({
        where: {
          providerId,
          status: BookingStatus.WORK_COMPLETED,
          completedAt: { gte: trendStart, lte: trendEnd },
        },
        select: { amount: true, completedAt: true },
      }),

      client.instantRequest.count({
        where: { providerId, status: { in: ["OPEN", "FILLED"] } },
      }),

      client.instantRequest.count({
        where: { providerId, status: "COMPLETED" },
      }),
    ]);

    return {
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
      trendBookings,
      activeInstantRequests,
      completedInstantRequests,
    };
  }
}
