import { z } from "zod";
export const updateProfileSchema = z.object({
    name: z.string().min(3).optional(),
    email: z.email().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    profileImage: z.string().optional(),
});
export const changePasswordSchema = z.object({
    oldPassword: z
        .string()
        .min(8),
    newPassword: z
        .string()
        .min(8),
});
//# sourceMappingURL=user.validation.js.map