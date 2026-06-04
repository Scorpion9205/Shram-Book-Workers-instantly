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

export type CreateWorkerProfileInput =
  z.infer<typeof createWorkerProfileSchema>;

export const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export type UpdateAvailabilityInput =
  z.infer<typeof updateAvailabilitySchema>;