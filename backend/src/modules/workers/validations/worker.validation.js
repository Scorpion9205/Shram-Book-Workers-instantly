import { z } from "zod";
export const createWorkerProfileSchema = z.object({
    bio: z.string().optional(),
    experience: z
        .number()
        .min(0, "Experience cannot be negative"),
    dailyRate: z
        .number()
        .positive("Daily rate must be greater than 0")
        .optional(),
});
export const updateWorkerProfileSchema = createWorkerProfileSchema.partial();
export const updateAvailabilitySchema = z.object({
    isAvailable: z.boolean(),
});
//# sourceMappingURL=worker.validation.js.map