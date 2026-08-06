import type { CreateJobInput } from "../validations/job.validation.js";
import type { ApplyJobInput } from "../validations/job.validation.js";
export declare class JobService {
    static createJob(userId: string, data: CreateJobInput): Promise<{
        skill: {
            id: string;
            name: string;
            baseRate: number;
        };
        provider: {
            id: string;
            name: string;
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
    }>;
    static getAllJobs(userId: string): Promise<any>;
    static getJobById(jobId: string): Promise<{
        skill: {
            id: string;
            name: string;
            baseRate: number;
        };
        _count: {
            applications: number;
            bookings: number;
        };
        provider: {
            id: string;
            name: string;
            phone: string;
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
    }>;
    static applyForJob(userId: string, jobId: string, data: ApplyJobInput): Promise<{
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
    }>;
    static getJobApplications(userId: string, jobId: string): Promise<{
        agent: {
            user: {
                name: string;
                phone: string;
                profileImage: string | null;
            };
            rating: number;
            agencyName: string;
        } | null;
        id: string;
        createdAt: Date;
        worker: {
            user: {
                name: string;
                phone: string;
                profileImage: string | null;
            };
            experience: number;
            dailyRate: number | null;
            rating: number;
            totalJobs: number;
        } | null;
        status: import("@prisma/client").$Enums.ApplicationStatus;
        bidAmount: number | null;
        workerCount: number | null;
    }[]>;
    static acceptApplication(userId: string, applicationId: string): Promise<{
        success: boolean;
    }>;
    static rejectApplication(userId: string, applicationId: string): Promise<{
        success: boolean;
    }>;
    static getMyApplications(userId: string): Promise<{
        id: string;
        createdAt: Date;
        job: {
            id: string;
            skill: {
                name: string;
            };
            address: string | null;
            city: string | null;
            status: import("@prisma/client").$Enums.JobStatus;
            provider: {
                name: string;
                phone: string;
            };
            title: string;
            requiredWorkers: number;
            budget: number | null;
        };
        status: import("@prisma/client").$Enums.ApplicationStatus;
        bidAmount: number | null;
    }[]>;
    static getProviderJobs(userId: string): Promise<{
        id: string;
        skill: {
            name: string;
        };
        createdAt: Date;
        _count: {
            applications: number;
            bookings: number;
        };
        status: import("@prisma/client").$Enums.JobStatus;
        title: string;
        requiredWorkers: number;
        budget: number | null;
    }[]>;
}
//# sourceMappingURL=job.service.d.ts.map