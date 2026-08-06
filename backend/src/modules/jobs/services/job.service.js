import prisma from "../../../shared/config/prisma.js";
import { RedisService } from "../../../shared/services/redis/redis.service.js";
import { CacheInvalidationService } from "../../../shared/services/cache/cache-invalidation.service.js";
export class JobService {
    static async createJob(userId, data) {
        await prisma.providerProfile.upsert({
            where: {
                userId,
            },
            update: {},
            create: {
                userId,
            },
        });
        const skill = await prisma.skill.findUnique({
            where: {
                id: data.skillId
            }
        });
        if (!skill) {
            throw new Error("Skill not found");
        }
        const job = await prisma.job.create({
            data: {
                title: data.title,
                description: data.description ?? null,
                skillId: data.skillId,
                requiredWorkers: data.requiredWorkers,
                budget: data.budget ?? null,
                latitude: data.latitude ?? null,
                longitude: data.longitude ?? null,
                address: data.address ?? null,
                city: data.city ?? null,
                state: data.state ?? null,
                pincode: data.pincode ?? null,
                providerId: userId,
            },
            include: {
                skill: true,
                provider: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        await CacheInvalidationService.afterJobCreated(userId);
        return job;
    }
    static async getAllJobs(userId) {
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                role: true,
            },
        });
        if (!user) {
            throw new Error("User not found");
        }
        let cacheKey = "";
        let skillIds = [];
        if (user.role === "WORKER") {
            cacheKey = `jobs:worker:${userId}`;
            const worker = await prisma.workerProfile.findUnique({
                where: {
                    userId,
                },
                include: {
                    skills: true,
                },
            });
            if (!worker) {
                throw new Error("Worker profile not found");
            }
            skillIds = worker.skills.map((skill) => skill.skillId);
        }
        else if (user.role === "AGENT") {
            cacheKey = `jobs:agent:${userId}`;
            const agent = await prisma.agentProfile.findUnique({
                where: {
                    userId,
                },
            });
            if (!agent) {
                throw new Error("Agent profile not found");
            }
            const linkedWorkers = await prisma.agentWorker.findMany({
                where: {
                    agentId: agent.id,
                },
                include: {
                    worker: {
                        include: {
                            skills: true,
                        },
                    },
                },
            });
            skillIds = [
                ...new Set(linkedWorkers.flatMap((item) => item.worker.skills.map((skill) => skill.skillId))),
            ];
        }
        else {
            throw new Error("Only workers and agents can access jobs.");
        }
        if (skillIds.length === 0) {
            return {
                jobs: [],
            };
        }
        const cachedJobs = await RedisService.get(cacheKey);
        if (cachedJobs) {
            console.log("✅ Jobs from Redis");
            return cachedJobs;
        }
        const jobs = await prisma.job.findMany({
            where: {
                status: "OPEN",
                skillId: {
                    in: skillIds,
                },
            },
            select: {
                id: true,
                title: true,
                description: true,
                budget: true,
                requiredWorkers: true,
                latitude: true,
                longitude: true,
                address: true,
                city: true,
                state: true,
                createdAt: true,
                skill: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                provider: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        await RedisService.set(cacheKey, {
            jobs,
        }, 120);
        return {
            jobs,
        };
    }
    static async getJobById(jobId) {
        const job = await prisma.job.findUnique({
            where: {
                id: jobId,
            },
            include: {
                skill: {
                    select: {
                        id: true,
                        name: true,
                        baseRate: true,
                    },
                },
                provider: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                    },
                },
                _count: {
                    select: {
                        applications: true,
                        bookings: true,
                    },
                },
            },
        });
        if (!job) {
            throw new Error("Job not found");
        }
        return job;
    }
    static async applyForJob(userId, jobId, data) {
        console.log({
            userId,
            jobId,
            data,
        });
        const worker = await prisma.workerProfile.findUnique({
            where: {
                userId,
            },
        });
        console.log(worker);
        if (!worker) {
            throw new Error("Worker profile not found");
        }
        const job = await prisma.job.findUnique({
            where: {
                id: jobId,
            },
        });
        console.log(job);
        if (!job) {
            throw new Error("Job not found");
        }
        if (job.providerId === userId) {
            throw new Error("You cannot apply to your own job.");
        }
        if (job.status !== "OPEN") {
            throw new Error("Job is closed");
        }
        const alreadyApplied = await prisma.application.findFirst({
            where: {
                jobId,
                workerId: worker.id,
            },
        });
        if (alreadyApplied) {
            throw new Error("You have already applied");
        }
        const application = await prisma.application.create({
            data: {
                jobId,
                applicantType: "WORKER",
                workerId: worker.id,
                message: data.message ?? null,
                workerCount: data.workerCount ?? null,
                bidAmount: data.bidAmount,
                status: "PENDING",
            },
        });
        return application;
    }
    static async getJobApplications(userId, jobId) {
        const job = await prisma.job.findUnique({
            where: {
                id: jobId,
            },
        });
        if (!job) {
            throw new Error("Job not found");
        }
        if (job.providerId !== userId) {
            throw new Error("Unauthorized");
        }
        const applications = await prisma.application.findMany({
            where: {
                jobId,
            },
            select: {
                id: true,
                bidAmount: true,
                workerCount: true,
                status: true,
                createdAt: true,
                worker: {
                    select: {
                        experience: true,
                        dailyRate: true,
                        rating: true,
                        totalJobs: true,
                        user: {
                            select: {
                                name: true,
                                phone: true,
                                profileImage: true,
                            },
                        },
                    },
                },
                agent: {
                    select: {
                        agencyName: true,
                        rating: true,
                        user: {
                            select: {
                                name: true,
                                phone: true,
                                profileImage: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                bidAmount: "asc",
            },
        });
        return applications;
    }
    static async acceptApplication(userId, applicationId) {
        const result = await prisma.$transaction(async (tx) => {
            const application = await tx.application.findUnique({
                where: {
                    id: applicationId,
                },
                include: {
                    job: true,
                    worker: true,
                    agent: true,
                },
            });
            if (!application) {
                throw new Error("Application not found");
            }
            if (application.applicantType === "WORKER") {
                if (!application.worker?.userId) {
                    throw new Error("Worker user not found");
                }
            }
            else if (application.applicantType === "AGENT") {
                if (!application.agent?.userId) {
                    throw new Error("Agent user not found");
                }
            }
            if (application.job.providerId !==
                userId) {
                throw new Error("Unauthorized");
            }
            if (application.status !== "PENDING") {
                throw new Error("Application already processed");
            }
            if (application.job.status !==
                "OPEN") {
                throw new Error("Job is closed");
            }
            await tx.application.update({
                where: {
                    id: applicationId,
                },
                data: {
                    status: "ACCEPTED",
                },
            });
            await tx.booking.create({
                data: {
                    jobId: application.jobId,
                    providerId: application.job.providerId,
                    workerId: application.workerId,
                    agentId: application.agentId,
                    amount: application.bidAmount ?? 0,
                    status: "CONFIRMED",
                },
            });
            const decrementAmount = application.applicantType === "AGENT"
                ? (application.workerCount ?? 1)
                : 1;
            const updatedJob = await tx.job.update({
                where: {
                    id: application.jobId,
                },
                data: {
                    requiredWorkers: {
                        decrement: decrementAmount,
                    },
                },
            });
            if (updatedJob.requiredWorkers <= 0) {
                await tx.job.update({
                    where: {
                        id: updatedJob.id,
                    },
                    data: {
                        status: "ASSIGNED",
                        requiredWorkers: 0,
                    },
                });
                await tx.application.updateMany({
                    where: {
                        jobId: updatedJob.id,
                        status: "PENDING",
                    },
                    data: {
                        status: "REJECTED",
                    },
                });
            }
            return {
                success: true,
                workerUserId: application.worker?.userId ?? null,
                agentUserId: application.agent?.userId ?? null,
            };
        });
        await CacheInvalidationService.afterJobAccepted(userId, result.workerUserId, result.agentUserId);
        return {
            success: true
        };
    }
    static async rejectApplication(userId, applicationId) {
        const application = await prisma.application.findUnique({
            where: {
                id: applicationId,
            },
            include: {
                job: true,
            },
        });
        if (!application) {
            throw new Error("Application not found");
        }
        if (application.job.providerId !==
            userId) {
            throw new Error("Unauthorized");
        }
        if (application.status !== "PENDING") {
            throw new Error("Application already processed");
        }
        await prisma.application.update({
            where: {
                id: applicationId,
            },
            data: {
                status: "REJECTED",
            },
        });
        return {
            success: true,
        };
    }
    static async getMyApplications(userId) {
        const worker = await prisma.workerProfile.findUnique({
            where: {
                userId,
            },
        });
        if (!worker) {
            throw new Error("Worker profile not found");
        }
        const applications = await prisma.application.findMany({
            where: {
                workerId: worker.id,
            },
            select: {
                id: true,
                bidAmount: true,
                status: true,
                createdAt: true,
                job: {
                    select: {
                        id: true,
                        title: true,
                        budget: true,
                        address: true,
                        city: true,
                        requiredWorkers: true,
                        status: true,
                        provider: {
                            select: {
                                name: true,
                                phone: true,
                            },
                        },
                        skill: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        return applications;
    }
    static async getProviderJobs(userId) {
        const jobs = await prisma.job.findMany({
            where: {
                providerId: userId,
            },
            select: {
                id: true,
                title: true,
                budget: true,
                requiredWorkers: true,
                status: true,
                createdAt: true,
                skill: {
                    select: {
                        name: true,
                    },
                },
                _count: {
                    select: {
                        applications: true,
                        bookings: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        return jobs;
    }
}
//# sourceMappingURL=job.service.js.map