import { z } from "zod";
import { signupSchema, loginSchema } from "../validations/auth.validation.js";
type SignupInput = z.infer<typeof signupSchema>;
type LoginInput = z.infer<typeof loginSchema>;
export declare class AuthService {
    static signup(data: SignupInput): Promise<{
        success: boolean;
        message: string;
    }>;
    static login(data: LoginInput): Promise<{
        user: {
            id: string;
            name: string;
            phone: string;
            email: string | null;
            role: import("@prisma/client").$Enums.UserRole;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    static refreshToken(refreshToken: string): Promise<{
        accessToken: string;
    }>;
    static logout(userId: string): Promise<boolean>;
    static forgotPassword(identifier: string): Promise<{
        success: boolean;
        message: string;
    }>;
    static resetPassword(token: string, password: string): Promise<{
        success: boolean;
        message: string;
    }>;
    static sendOTP(identifier: string): Promise<{
        success: boolean;
        message: string;
    }>;
    static verifyOTP(identifier: string, otp: string): Promise<{
        user: {
            id: string;
            name: string;
            phone: string;
            email: string | null;
            role: import("@prisma/client").$Enums.UserRole;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    static resendOTP(identifier: string): Promise<{
        success: boolean;
        message: string;
    }>;
    static changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
export {};
//# sourceMappingURL=auth.service.d.ts.map