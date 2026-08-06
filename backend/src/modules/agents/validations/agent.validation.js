import { z } from "zod";
export const createAgentProfileSchema = z.object({
    agencyName: z
        .string()
        .trim()
        .min(3, "Agency name must be at least 3 characters.")
        .max(100, "Agency name cannot exceed 100 characters."),
    description: z
        .string()
        .trim()
        .max(500, "Description cannot exceed 500 characters.")
        .optional(),
});
export const updateAgentProfileSchema = createAgentProfileSchema.partial();
//# sourceMappingURL=agent.validation.js.map