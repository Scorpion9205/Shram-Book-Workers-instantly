import { z } from "zod";
export declare const createProviderProfileSchema: z.ZodObject<{
    providerType: z.ZodEnum<{
        INDIVIDUAL: "INDIVIDUAL";
        COMPANY: "COMPANY";
    }>;
    companyName: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateProviderProfileInput = z.infer<typeof createProviderProfileSchema>;
export declare const updateProviderProfileSchema: z.ZodObject<{
    providerType: z.ZodOptional<z.ZodEnum<{
        INDIVIDUAL: "INDIVIDUAL";
        COMPANY: "COMPANY";
    }>>;
    companyName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export type UpdateProviderProfileInput = z.infer<typeof updateProviderProfileSchema>;
//# sourceMappingURL=provider.validation.d.ts.map