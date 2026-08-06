import { z } from "zod";
export declare const createAgentProfileSchema: z.ZodObject<{
    agencyName: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateAgentProfileInput = z.infer<typeof createAgentProfileSchema>;
export declare const updateAgentProfileSchema: z.ZodObject<{
    agencyName: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export type UpdateAgentProfileInput = z.infer<typeof updateAgentProfileSchema>;
//# sourceMappingURL=agent.validation.d.ts.map