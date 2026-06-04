import { z } from "zod";

export const createProviderProfileSchema = z.object({
  providerType: z.enum([
    "INDIVIDUAL",
    "COMPANY",
  ]),

  companyName: z.string().optional(),

  description: z.string().optional(),
});

export type CreateProviderProfileInput =
  z.infer<typeof createProviderProfileSchema>;

export const updateProviderProfileSchema =
  createProviderProfileSchema.partial();

export type UpdateProviderProfileInput =
  z.infer<typeof updateProviderProfileSchema>;