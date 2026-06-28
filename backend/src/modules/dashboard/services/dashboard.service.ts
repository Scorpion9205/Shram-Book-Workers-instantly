import prisma from "../../../shared/config/prisma.js";
import { RedisService } from "../../../shared/services/redis/redis.service.js";
export class DashboardService {

  static async getWorkerDashboard(
    userId: string
  ) {
    const cacheKey =
      `dashboard:worker:${userId}`;

    const cachedDashboard =
      await RedisService.get(cacheKey);

    if (cachedDashboard) {

      console.log("✅ Dashboard from Redis");

      return cachedDashboard;

    }

    const worker =
      await prisma.workerProfile.findUnique({
        where: {
          userId,
        },
      });

    if (!worker) {
      throw new Error(
        "Worker profile not found"
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(
      weekStart.getDate() - 7
    );

    const monthStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    const [
      todayBookings,
      weekBookings,
      monthBookings,
      pendingBookings,
      inProgressBookings,
      completedBookings
    ] = await Promise.all([

      prisma.booking.aggregate({
        where: {
          workerId: worker.id,
          status: "COMPLETED",
          completedAt: {
            gte: today,
          },
        },

        _sum: {
          amount: true,
        },

        _count: true,
      }),

      prisma.booking.aggregate({
        where: {
          workerId: worker.id,
          status: "COMPLETED",
          completedAt: {
            gte: weekStart,
          },
        },

        _sum: {
          amount: true,
        },

        _count: true,
      }),

      prisma.booking.aggregate({
        where: {
          workerId: worker.id,
          status: "COMPLETED",
          completedAt: {
            gte: monthStart,
          },
        },

        _sum: {
          amount: true,
        },

        _count: true,
      }),

      prisma.booking.count({
        where: {
          workerId: worker.id,
          status: "CONFIRMED",
        },
      }),

      prisma.booking.count({
        where: {
          workerId: worker.id,
          status: "IN_PROGRESS",
        },
      }),

      prisma.booking.count({
        where: {
          workerId: worker.id,
          status: "COMPLETED",
        },
      }),

    ]);

    const dashboard = {

      todayEarnings:
        todayBookings._sum.amount ?? 0,

      thisWeekEarnings:
        weekBookings._sum.amount ?? 0,

      thisMonthEarnings:
        monthBookings._sum.amount ?? 0,

      todayJobs:
        todayBookings._count,

      thisWeekJobs:
        weekBookings._count,

      thisMonthJobs:
        monthBookings._count,

      pendingBookings,

      inProgressBookings,

      completedBookings,

      rating:
        worker.rating,

      totalReviews:
        worker.totalReviews,

      totalJobs:
        worker.totalJobs,

      activeBooking:
        inProgressBookings > 0,

    };
    await RedisService.set(
      cacheKey,
      dashboard,
      60
    );

    console.log("✅ Dashboard cached");

    return dashboard;

  }
  static async getProviderDashboard(
    userId: string
  ) {
    const cacheKey =
      `dashboard:provider:${userId}`;

    const cachedDashboard =
      await RedisService.get(cacheKey);

    if (cachedDashboard) {

      console.log("✅ Provider Dashboard from Redis");

      return cachedDashboard;

    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(
      weekStart.getDate() - 7
    );

    const monthStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

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
    ] = await Promise.all([

      prisma.job.count({
        where: {
          providerId: userId,

          status: {
            in: [
              "OPEN",
              "ASSIGNED",
              "IN_PROGRESS",
            ],
          },
        },
      }),

      prisma.job.count({
        where: {
          providerId: userId,
          status: "COMPLETED",
        },
      }),

      prisma.booking.count({
        where: {
          providerId: userId,

          status: {
            in: [
              "CONFIRMED",
              "IN_PROGRESS",
            ],
          },
        },
      }),

      prisma.booking.count({
        where: {
          providerId: userId,
          status: "COMPLETED",
        },
      }),

      prisma.application.count({
        where: {
          job: {
            providerId: userId,
          },

          status: "PENDING",
        },
      }),

      prisma.booking.aggregate({
        where: {
          providerId: userId,

          status: "COMPLETED",

          completedAt: {
            gte: today,
          },
        },

        _sum: {
          amount: true,
        },
      }),

      prisma.booking.aggregate({
        where: {
          providerId: userId,

          status: "COMPLETED",

          completedAt: {
            gte: weekStart,
          },
        },

        _sum: {
          amount: true,
        },
      }),

      prisma.booking.aggregate({
        where: {
          providerId: userId,

          status: "COMPLETED",

          completedAt: {
            gte: monthStart,
          },
        },

        _sum: {
          amount: true,
        },
      }),

      prisma.booking.count({
        where: {
          providerId: userId,

          status: "COMPLETED",
        },
      }),

    ]);

    const dashboard = {

      activeJobs,

      completedJobs,

      activeBookings,

      completedBookings,

      pendingApplications,

      workersHired:
        totalWorkersHired,

      todaySpent:
        todaySpent._sum.amount ?? 0,

      thisWeekSpent:
        weekSpent._sum.amount ?? 0,

      thisMonthSpent:
        monthSpent._sum.amount ?? 0,

    };

    await RedisService.set(
      cacheKey,
      dashboard,
      60
    );

    console.log(
      "✅ Provider Dashboard Cached"
    );

    return dashboard;
  }

}