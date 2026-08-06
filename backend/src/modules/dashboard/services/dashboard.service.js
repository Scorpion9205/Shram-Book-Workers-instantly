import prisma from "../../../shared/config/prisma.js";
import { RedisService } from "../../../shared/services/redis/redis.service.js";
export class DashboardService {
    static async getWorkerDashboard(userId, range, startDateStr, endDateStr) {
        const activeRange = range || "7days";
        const cacheKey = `dashboard:worker:${userId}:${activeRange}:${startDateStr || ""}:${endDateStr || ""}`;
        const cachedDashboard = await RedisService.get(cacheKey);
        if (cachedDashboard) {
            console.log("✅ Dashboard from Redis");
            return cachedDashboard;
        }
        const worker = await prisma.workerProfile.findUnique({
            where: {
                userId,
            },
        });
        if (!worker) {
            throw new Error("Worker profile not found");
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
        }
        else if (activeRange === "custom" && startDateStr && endDateStr) {
            trendStart = new Date(startDateStr);
            trendStart.setHours(0, 0, 0, 0);
            trendEnd = new Date(endDateStr);
            trendEnd.setHours(23, 59, 59, 999);
        }
        const [todayBookings, pendingBookings, completedBookings, currentBooking, upcomingBookings, recentReviews, trendBookings,] = await Promise.all([
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
                    status: "COMPLETED",
                },
            }),
            // The booking currently in progress (if any) — shown as the
            // worker's "active job" card on the dashboard.
            prisma.booking.findFirst({
                where: {
                    workerId: worker.id,
                    status: "IN_PROGRESS",
                },
                orderBy: {
                    startedAt: "desc",
                },
                include: {
                    job: {
                        include: {
                            skill: {
                                select: { id: true, name: true },
                            },
                        },
                    },
                    provider: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            profileImage: true,
                        },
                    },
                },
            }),
            // Confirmed bookings not yet started — the worker's upcoming jobs.
            prisma.booking.findMany({
                where: {
                    workerId: worker.id,
                    status: "CONFIRMED",
                    jobId: { not: null },
                },
                take: 5,
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    job: {
                        include: {
                            skill: {
                                select: { id: true, name: true },
                            },
                            provider: {
                                select: { id: true, name: true },
                            },
                        },
                    },
                },
            }),
            prisma.review.findMany({
                where: {
                    workerId: worker.id,
                },
                take: 5,
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    provider: {
                        select: { id: true, name: true },
                    },
                },
            }),
            // Daily completed earnings for the last 7 days, used to draw the
            // earnings trend sparkline on the dashboard.
            prisma.booking.findMany({
                where: {
                    workerId: worker.id,
                    status: "COMPLETED",
                    completedAt: {
                        gte: trendStart,
                        lte: trendEnd,
                    },
                },
                select: {
                    amount: true,
                    completedAt: true,
                },
            }),
        ]);
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
                .filter(booking => booking.completedAt &&
                booking.completedAt >= current &&
                booking.completedAt < next)
                .reduce((sum, booking) => sum + booking.amount, 0);
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
            todaysEarnings: todayBookings._sum.amount ?? 0,
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
                id: b.job.id,
                title: b.job.title,
                description: b.job.description ?? undefined,
                budget: b.job.budget ?? undefined,
                requiredWorkers: b.job.requiredWorkers,
                latitude: b.job.latitude ?? 0,
                longitude: b.job.longitude ?? 0,
                address: b.job.address ?? undefined,
                city: b.job.city ?? undefined,
                state: b.job.state ?? undefined,
                pincode: b.job.pincode ?? undefined,
                status: b.job.status,
                createdAt: b.job.createdAt,
                skill: b.job.skill ?? undefined,
                provider: b.job.provider ?? undefined,
            })),
            recentReviews: recentReviews.map((r) => ({
                id: r.id,
                bookingId: r.bookingId,
                rating: r.rating,
                comment: r.comment ?? undefined,
                createdAt: r.createdAt,
                provider: r.provider
                    ? { id: r.provider.id, name: r.provider.name }
                    : undefined,
            })),
            earningsTrend,
        };
        await RedisService.set(cacheKey, dashboard, 60);
        console.log("✅ Dashboard cached");
        return dashboard;
    }
    static async getProviderDashboard(userId, range, startDateStr, endDateStr) {
        const activeRange = range || "7days";
        const cacheKey = `dashboard:provider:${userId}:${activeRange}:${startDateStr || ""}:${endDateStr || ""}`;
        const cachedDashboard = await RedisService.get(cacheKey);
        if (cachedDashboard) {
            console.log("✅ Provider Dashboard from Redis");
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
        }
        else if (activeRange === "custom" && startDateStr && endDateStr) {
            trendStart = new Date(startDateStr);
            trendStart.setHours(0, 0, 0, 0);
            trendEnd = new Date(endDateStr);
            trendEnd.setHours(23, 59, 59, 999);
        }
        const [activeJobs, completedJobs, activeBookings, completedBookings, pendingApplications, todaySpent, weekSpent, monthSpent, totalWorkersHired, recentBookings, recentApplicants, analyticsBookings,] = await Promise.all([
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
            prisma.booking.findMany({
                where: {
                    providerId: userId,
                },
                take: 5,
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    worker: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    phone: true,
                                    profileImage: true,
                                },
                            },
                        },
                    },
                    review: {
                        select: {
                            id: true,
                            rating: true,
                            comment: true,
                        },
                    },
                },
            }),
            prisma.application.findMany({
                where: {
                    job: {
                        providerId: userId,
                    },
                },
                take: 5,
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    job: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                    worker: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    phone: true,
                                    profileImage: true,
                                },
                            },
                        },
                    },
                    agent: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    phone: true,
                                    profileImage: true,
                                },
                            },
                        },
                    },
                },
            }),
            prisma.booking.findMany({
                where: {
                    providerId: userId,
                    status: "COMPLETED",
                    completedAt: {
                        gte: trendStart,
                        lte: trendEnd,
                    },
                },
                select: {
                    amount: true,
                    completedAt: true,
                },
            }),
        ]);
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
                .filter(booking => booking.completedAt &&
                booking.completedAt >= current &&
                booking.completedAt < next)
                .reduce((sum, booking) => sum + booking.amount, 0);
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
            activeJobs,
            completedJobs,
            activeBookings,
            completedBookings,
            pendingApplications,
            workersHired: totalWorkersHired,
            todaySpent: todaySpent._sum.amount ?? 0,
            thisWeekSpent: weekSpent._sum.amount ?? 0,
            thisMonthSpent: monthSpent._sum.amount ?? 0,
            analyticsTrend,
            recentBookings,
            recentApplicants,
        };
        await RedisService.set(cacheKey, dashboard, 60);
        console.log("✅ Provider Dashboard Cached");
        return dashboard;
    }
}
//# sourceMappingURL=dashboard.service.js.map