import { z } from "zod";

export const createJobSchema = z.object({
  title: z
    .string()
    .min(3)
    .max(100),

  description: z
    .string()
    .max(3000, "Description must be at most 3000 characters")
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
    .max(300, "Address must be at most 300 characters")
    .optional(),

  city: z
    .string()
    .max(100, "City must be at most 100 characters")
    .optional(),

  state: z
    .string()
    .max(100, "State must be at most 100 characters")
    .optional(),

  pincode: z
    .string()
    .max(20, "Pincode must be at most 20 characters")
    .optional(),
});

export type CreateJobInput =
  z.infer<typeof createJobSchema>;

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

export type ApplyJobInput =
  z.infer<
    typeof applyJobSchema
  >;