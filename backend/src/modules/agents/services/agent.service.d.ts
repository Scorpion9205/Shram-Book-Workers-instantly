import type { CreateAgentProfileInput, UpdateAgentProfileInput } from "../validations/agent.validation.js";
export declare class AgentService {
    private static getAgentByUserId;
    static createProfile(userId: string, data: CreateAgentProfileInput): Promise<{
        user: {
            id: string;
            name: string;
            role: import("@prisma/client").$Enums.UserRole;
            phone: string;
            email: string | null;
            profileImage: string | null;
            city: string | null;
            state: string | null;
        };
    } & {
        id: string;
        userId: string;
        phone: string | null;
        isVerified: boolean;
        createdAt: Date;
        updatedAt: Date;
        profileImage: string | null;
        city: string | null;
        state: string | null;
        rating: number;
        description: string | null;
        agencyName: string;
    }>;
    static getMyProfile(userId: string): Promise<{
        user: {
            id: string;
            name: string;
            role: import("@prisma/client").$Enums.UserRole;
            phone: string;
            email: string | null;
            profileImage: string | null;
            city: string | null;
            state: string | null;
        };
    } & {
        id: string;
        userId: string;
        phone: string | null;
        isVerified: boolean;
        createdAt: Date;
        updatedAt: Date;
        profileImage: string | null;
        city: string | null;
        state: string | null;
        rating: number;
        description: string | null;
        agencyName: string;
    }>;
    static updateProfile(userId: string, data: UpdateAgentProfileInput): Promise<{
        user: {
            id: string;
            name: string;
            role: import("@prisma/client").$Enums.UserRole;
            phone: string;
            email: string | null;
            profileImage: string | null;
            city: string | null;
            state: string | null;
        };
    } & {
        id: string;
        userId: string;
        phone: string | null;
        isVerified: boolean;
        createdAt: Date;
        updatedAt: Date;
        profileImage: string | null;
        city: string | null;
        state: string | null;
        rating: number;
        description: string | null;
        agencyName: string;
    }>;
    static getDashboard(userId: string): Promise<{
        agencyName: string;
        rating: number;
        totalWorkers: number;
        availableWorkers: number;
        pendingApplications: number;
        activeBookings: number;
        completedBookings: number;
    }>;
    static getMyApplications(userId: string): Promise<({
        job: {
            skill: {
                id: string;
                name: string;
                baseRate: number;
            };
            provider: {
                id: string;
                name: string;
                phone: string;
                profileImage: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            address: string | null;
            city: string | null;
            pincode: string | null;
            state: string | null;
            description: string | null;
            skillId: string;
            latitude: number | null;
            longitude: number | null;
            status: import("@prisma/client").$Enums.JobStatus;
            providerId: string;
            title: string;
            requiredWorkers: number;
            budget: number | null;
        };
    } & {
        id: string;
        message: string | null;
        createdAt: Date;
        updatedAt: Date;
        workerId: string | null;
        agentId: string | null;
        status: import("@prisma/client").$Enums.ApplicationStatus;
        jobId: string;
        bidAmount: number | null;
        workerCount: number | null;
        applicantType: import("@prisma/client").$Enums.ApplicantType;
    })[]>;
    static getMyBookings(userId: string): Promise<({
        job: ({
            skill: {
                id: string;
                name: string;
                baseRate: number;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            address: string | null;
            city: string | null;
            pincode: string | null;
            state: string | null;
            description: string | null;
            skillId: string;
            latitude: number | null;
            longitude: number | null;
            status: import("@prisma/client").$Enums.JobStatus;
            providerId: string;
            title: string;
            requiredWorkers: number;
            budget: number | null;
        }) | null;
        provider: {
            id: string;
            name: string;
            phone: string;
            profileImage: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        workerId: string | null;
        agentId: string | null;
        status: import("@prisma/client").$Enums.BookingStatus;
        jobId: string | null;
        providerId: string;
        amount: number;
        startedAt: Date | null;
        completedAt: Date | null;
        instantRequestId: string | null;
        instantRequestResponseId: string | null;
    })[]>;
}
//# sourceMappingURL=agent.service.d.ts.map