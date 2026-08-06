import { z } from "zod";
export declare const createWorkerProfileSchema: z.ZodObject<{
    bio: z.ZodOptional<z.ZodString>;
    experience: z.ZodNumber;
    dailyRate: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const updateWorkerProfileSchema: z.ZodObject<{
    bio: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    experience: z.ZodOptional<z.ZodNumber>;
    dailyRate: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export type CreateWorkerProfileInput = z.infer<typeof createWorkerProfileSchema>;
export declare const updateAvailabilitySchema: z.ZodObject<{
    isAvailable: z.ZodBoolean;
}, z.core.$strip>;
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
//# sourceMappingURL=worker.validation.d.ts.map