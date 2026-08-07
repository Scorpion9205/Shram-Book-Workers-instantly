import type { CreateInstantRequestInput } from "../validations/instant-request.validation.js";
export declare class InstantRequestService {
    static createInstantRequest(userId: string, data: CreateInstantRequestInput): Promise<{
        provider: {
            name: string;
        };
        items: ({
            skill: {
                id: string;
                name: string;
                baseRate: number;
            };
        } & {
            id: string;
            skillId: string;
            status: import("@prisma/client").$Enums.InstantRequestStatus;
            requiredWorkers: number;
            requestId: string;
            acceptedWorkers: number;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        address: string | null;
        description: string | null;
        skillId: string | null;
        latitude: number;
        longitude: number;
        status: import("@prisma/client").$Enums.InstantRequestStatus;
        providerId: string;
        amount: number;
        title: string;
        bookingMode: import("@prisma/client").$Enums.BookingMode;
        expiresAt: Date;
    }>;
    static getNearbyRequests(userId: string): Promise<any>;
    static acceptRequest(userId: string, itemId: string): Promise<{
        bookingId: string;
        id?: string;
        skillId?: string;
        status?: import("@prisma/client").$Enums.InstantRequestStatus;
        requiredWorkers?: number;
        requestId?: string;
        acceptedWorkers?: number;
    }>;
    static getMyRequests(userId: string): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.InstantRequestStatus;
        amount: number;
        title: string;
        items: {
            id: string;
            skill: {
                name: string;
            };
            requiredWorkers: number;
            acceptedWorkers: number;
            responses: {
                worker: {
                    user: {
                        name: string;
                        phone: string;
                    };
                };
                status: import("@prisma/client").$Enums.InstantResponseStatus;
            }[];
        }[];
    }[]>;
    static submitBid(userId: string, requestId: string, bidAmount: number): Promise<{
        worker: {
            user: {
                id: string;
                name: string;
                role: import("@prisma/client").$Enums.UserRole;
                phone: string;
                email: string | null;
                password: string;
                isVerified: boolean;
                refreshToken: string | null;
                createdAt: Date;
                updatedAt: Date;
                address: string | null;
                isActive: boolean;
                profileImage: string | null;
                city: string | null;
                pincode: string | null;
                state: string | null;
            };
        } & {
            id: string;
            userId: string;
            bio: string | null;
            experience: number;
            dailyRate: number | null;
            isAvailable: boolean;
            rating: number;
            totalJobs: number;
            totalReviews: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        workerId: string;
        status: import("@prisma/client").$Enums.InstantBidStatus;
        bidAmount: number;
        instantRequestId: string;
    }>;
    static selectBid(userId: string, requestId: string, bidId: string): Promise<{
        bookingId: string;
        providerUserId: string;
        workerUserId: string;
    }>;
}
//# sourceMappingURL=instant-request.service.d.ts.map