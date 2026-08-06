import { z } from "zod";
export const createProviderProfileSchema = z.object({
    providerType: z.enum([
        "INDIVIDUAL",
        "COMPANY",
    ]),
    companyName: z.string().optional(),
    description: z.string().optional(),
});
export const updateProviderProfileSchema = createProviderProfileSchema.partial();
//# sourceMappingURL=provider.validation.js.map