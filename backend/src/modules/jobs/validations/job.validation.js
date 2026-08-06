import { z } from "zod";
export const createJobSchema = z.object({
    title: z
        .string()
        .min(3)
        .max(100),
    description: z
        .string()
        .optional(),
    skillId: z.uuid(),
    requiredWorkers: z
        .number()
        .int()
        .positive(),
    budget: z
        .number()
        .positive()
        .optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    address: z
        .string()
        .optional(),
    city: z
        .string()
        .optional(),
    state: z
        .string()
        .optional(),
    pincode: z
        .string()
        .optional(),
});
export const applyJobSchema = z.object({
    bidAmount: z
        .number()
        .positive(),
    workerCount: z
        .number()
        .int()
        .positive()
        .optional(),
    message: z
        .string()
        .trim()
        .max(500)
        .optional(),
});
//# sourceMappingURL=job.validation.js.map