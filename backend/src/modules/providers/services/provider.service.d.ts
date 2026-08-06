import type { CreateProviderProfileInput, UpdateProviderProfileInput } from "../validations/provider.validation.js";
export declare class ProviderService {
    static createProfile(userId: string, data: CreateProviderProfileInput): Promise<{
        id: string;
        userId: string;
        rating: number;
        companyName: string | null;
        description: string | null;
        providerType: import("@prisma/client").$Enums.ProviderType;
    }>;
    static getMyProfile(userId: string): Promise<{
        user: {
            id: string;
            name: string;
            role: import("@prisma/client").$Enums.UserRole;
            phone: string;
            email: string | null;
            address: string | null;
            profileImage: string | null;
            city: string | null;
            pincode: string | null;
            state: string | null;
        };
    } & {
        id: string;
        userId: string;
        rating: number;
        companyName: string | null;
        description: string | null;
        providerType: import("@prisma/client").$Enums.ProviderType;
    }>;
    static updateProfile(userId: string, data: UpdateProviderProfileInput): Promise<{
        id: string;
        userId: string;
        rating: number;
        companyName: string | null;
        description: string | null;
        providerType: import("@prisma/client").$Enums.ProviderType;
    }>;
}
//# sourceMappingURL=provider.service.d.ts.map