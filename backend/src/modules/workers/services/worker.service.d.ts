import type { CreateWorkerProfileInput } from "../validations/worker.validation.js";
import { updateWorkerProfileSchema } from "../validations/worker.validation.js";
import { z } from "zod";
type UpdateWorkerProfileInput = z.infer<typeof updateWorkerProfileSchema>;
import type { UpdateAvailabilityInput } from "../validations/worker.validation.js";
export declare class WorkerService {
    static createProfile(userId: string, data: CreateWorkerProfileInput): Promise<{
        id: string;
        userId: string;
        bio: string | null;
        experience: number;
        dailyRate: number | null;
        isAvailable: boolean;
        rating: number;
        totalJobs: number;
        totalReviews: number;
    }>;
    static getMyProfile(userId: string): Promise<{
        skills: {
            id: string;
            name: string;
            baseRate: number;
        }[];
        user: {
            id: string;
            name: string;
            phone: string;
            email: string | null;
            address: string | null;
            profileImage: string | null;
            city: string | null;
            pincode: string | null;
            state: string | null;
        };
        id: string;
        userId: string;
        bio: string | null;
        experience: number;
        dailyRate: number | null;
        isAvailable: boolean;
        rating: number;
        totalJobs: number;
        totalReviews: number;
    }>;
    static updateProfile(userId: string, data: UpdateWorkerProfileInput): Promise<{
        id: string;
        userId: string;
        bio: string | null;
        experience: number;
        dailyRate: number | null;
        isAvailable: boolean;
        rating: number;
        totalJobs: number;
        totalReviews: number;
    }>;
    static updateAvailability(userId: string, data: UpdateAvailabilityInput): Promise<{
        id: string;
        userId: string;
        bio: string | null;
        experience: number;
        dailyRate: number | null;
        isAvailable: boolean;
        rating: number;
        totalJobs: number;
        totalReviews: number;
    }>;
}
export {};
//# sourceMappingURL=worker.service.d.ts.map