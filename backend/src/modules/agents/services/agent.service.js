import prisma from "../../../shared/config/prisma.js";
import { BookingStatus, ApplicationStatus } from "@prisma/client";
export class AgentService {
    static async getAgentByUserId(userId) {
        const agent = await prisma.agentProfile.findUnique({
            where: {
                userId,
            },
        });
        if (!agent) {
            throw new Error("Agent profile not found.");
        }
        return agent;
    }
    static async createProfile(userId, data) {
        const existing = await prisma.agentProfile.findUnique({
            where: {
                userId,
            },
        });
        if (existing) {
            throw new Error("Agent profile already exists.");
        }
        return await prisma.agentProfile.create({
            data: {
                userId,
                agencyName: data.agencyName,
                description: data.description ?? null,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        role: true,
                        city: true,
                        state: true,
                        profileImage: true,
                    },
                },
            },
        });
    }
    static async getMyProfile(userId) {
        const profile = await prisma.agentProfile.findUnique({
            where: {
                userId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        role: true,
                        city: true,
                        state: true,
                        profileImage: true,
                    },
                },
            },
        });
        if (!profile) {
            throw new Error("Agent profile not found.");
        }
        return profile;
    }
    static async updateProfile(userId, data) {
        const exists = await prisma.agentProfile.findUnique({
            where: {
                userId,
            },
        });
        if (!exists) {
            throw new Error("Agent profile not found.");
        }
        return await prisma.agentProfile.update({
            where: {
                userId,
            },
            data: {
                ...(data.agencyName !== undefined && {
                    agencyName: data.agencyName,
                }),
                ...(data.description !== undefined && {
                    description: data.description,
                }),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        role: true,
                        city: true,
                        state: true,
                        profileImage: true,
                    },
                },
            },
        });
    }
    static async getDashboard(userId) {
        const agent = await prisma.agentProfile.findUnique({
            where: {
                userId
            }
        });
        if (!agent) {
            throw new Error("Agent profile not found.");
        }
        const [totalWorkers, availableWorkers, pendingApplications, activeBookings, completedBookings] = await Promise.all([
            prisma.agentWorker.count({
                where: {
                    agentId: agent.id
                }
            }),
            prisma.agentWorker.count({
                where: {
                    agentId: agent.id,
                    worker: {
                        isAvailable: true
                    }
                }
            }),
            prisma.application.count({
                where: {
                    agentId: agent.id,
                    status: ApplicationStatus.PENDING
                }
            }),
            prisma.booking.count({
                where: {
                    agentId: agent.id,
                    status: {
                        in: [
                            BookingStatus.PENDING,
                            BookingStatus.CONFIRMED,
                            BookingStatus.IN_PROGRESS
                        ]
                    }
                }
            }),
            prisma.booking.count({
                where: {
                    agentId: agent.id,
                    status: BookingStatus.COMPLETED
                }
            })
        ]);
        return {
            agencyName: agent.agencyName,
            rating: agent.rating,
            totalWorkers,
            availableWorkers,
            pendingApplications,
            activeBookings,
            completedBookings
        };
    }
    static async getMyApplications(userId) {
        const agent = await this.getAgentByUserId(userId);
        return await prisma.application.findMany({
            where: {
                agentId: agent.id,
            },
            include: {
                job: {
                    include: {
                        provider: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                                profileImage: true,
                            },
                        },
                        skill: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }
    static async getMyBookings(userId) {
        const agent = await this.getAgentByUserId(userId);
        return await prisma.booking.findMany({
            where: {
                agentId: agent.id,
            },
            include: {
                provider: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        profileImage: true,
                    },
                },
                job: {
                    include: {
                        skill: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }
}
//# sourceMappingURL=agent.service.js.map