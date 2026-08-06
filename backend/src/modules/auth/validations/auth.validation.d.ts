import { z } from "zod";
export declare const signupSchema: z.ZodObject<{
    name: z.ZodString;
    phone: z.ZodString;
    email: z.ZodOptional<z.ZodEmail>;
    password: z.ZodString;
    role: z.ZodEnum<{
        WORKER: "WORKER";
        PROVIDER: "PROVIDER";
        AGENT: "AGENT";
    }>;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    identifier: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const forgotPasswordSchema: z.ZodObject<{
    identifier: z.ZodString;
}, z.core.$strip>;
export declare const resetPasswordSchema: z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const sendOTPSchema: z.ZodObject<{
    identifier: z.ZodString;
}, z.core.$strip>;
export declare const verifyOTPSchema: z.ZodObject<{
    identifier: z.ZodString;
    otp: z.ZodString;
}, z.core.$strip>;
export declare const changePasswordSchema: z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=auth.validation.d.ts.map