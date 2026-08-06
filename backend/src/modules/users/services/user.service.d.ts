import type { UpdateProfileInput } from "../validations/user.validation.js";
export declare class UserService {
    static getProfile(userId: string): Promise<{
        id: string;
        name: string;
        role: import("@prisma/client").$Enums.UserRole;
        phone: string;
        email: string | null;
        isVerified: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    static updateProfile(userId: string, data: UpdateProfileInput): Promise<{
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
    }>;
    static deleteAccount(userId: string): Promise<boolean>;
    static changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean>;
}
//# sourceMappingURL=user.service.d.ts.map