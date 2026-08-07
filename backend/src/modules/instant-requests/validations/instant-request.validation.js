import { z } from "zod";
export const createInstantRequestSchema = z.object({
    title: z
        .string()
        .min(3, "Title must be at least 3 characters")
        .max(100, "Title cannot exceed 100 characters"),
    description: z
        .string()
        .max(500, "Description cannot exceed 500 characters")
        .optional(),
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().optional(),
    amount: z
        .number()
        .positive("Amount must be greater than 0")
        .optional(),
    bookingMode: z.enum(["DIRECT", "BIDDING"]),
    quoteId: z.string().uuid("Invalid quote ID"),
    items: z
        .array(z.object({
        skillId: z.uuid("Invalid skill id"),
        requiredWorkers: z
            .number()
            .int()
            .positive("Required workers must be at least 1"),
    }))
        .min(1, "At least one worker type is required"),
});
export const calculateFareSchema = z.object({
    items: z.array(z.object({
        skillId: z.uuid("Invalid skill id"),
        requiredWorkers: z
            .number()
            .int()
            .positive("Required workers must be at least 1"),
    }))
        .min(1, "At least one worker type is required"),
});
//# sourceMappingURL=instant-request.validation.js.map