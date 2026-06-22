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

  latitude: z.number(),

  longitude: z.number(),

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

export type CreateJobInput =
  z.infer<typeof createJobSchema>;