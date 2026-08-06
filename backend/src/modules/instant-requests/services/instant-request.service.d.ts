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
}
//# sourceMappingURL=instant-request.service.d.ts.map