import type { CreateReviewInput } from "../validations/review.validation.js";
export declare class ReviewService {
    static createReview(bookingId: string, providerId: string, data: CreateReviewInput): Promise<{
        id: string;
        createdAt: Date;
        rating: number;
        workerId: string;
        providerId: string;
        bookingId: string;
        comment: string | null;
    }>;
    static getWorkerRating(workerId: string): Promise<{
        id: string;
        rating: number;
        totalJobs: number;
        totalReviews: number;
        reviews: {
            id: string;
            createdAt: Date;
            rating: number;
            provider: {
                name: string;
            };
            comment: string | null;
        }[];
    }>;
    static getWorkerReviews(workerId: string): Promise<{
        id: string;
        rating: number;
        totalJobs: number;
        totalReviews: number;
        reviews: {
            id: string;
            createdAt: Date;
            booking: {
                id: string;
                job: {
                    title: string;
                } | null;
            };
            rating: number;
            provider: {
                id: string;
                name: string;
            };
            comment: string | null;
        }[];
    }>;
    static getProviderReviews(providerId: string): Promise<{
        id: string;
        createdAt: Date;
        booking: {
            id: string;
            job: {
                title: string;
            } | null;
        };
        rating: number;
        worker: {
            id: string;
            user: {
                name: string;
                profileImage: string | null;
            };
        };
        comment: string | null;
    }[]>;
}
//# sourceMappingURL=review.service.d.ts.map