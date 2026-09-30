import { z } from "zod";

export const createProviderProfileSchema = z.object({
  providerType: z.enum([
    "INDIVIDUAL",
    "COMPANY",
  ]),

  companyName: z.string().max(200, "Company name must be at most 200 characters").optional(),

  description: z.string().max(2000, "Description must be at most 2000 characters").optional(),
});

export type CreateProviderProfileInput =
  z.infer<typeof createProviderProfileSchema>;

export const updateProviderProfileSchema =
  createProviderProfileSchema.partial();

export type UpdateProviderProfileInput =
  z.infer<typeof updateProviderProfileSchema>;