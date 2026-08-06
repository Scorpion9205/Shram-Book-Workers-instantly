import { z } from "zod";
export declare const assignSkillsSchema: z.ZodPipe<z.ZodObject<{
    skillId: z.ZodOptional<z.ZodString>;
    skillIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>, z.ZodTransform<{
    skillIds: string[];
}, {
    skillId?: string | undefined;
    skillIds?: string[] | undefined;
}>>;
export type AssignSkillsInput = z.infer<typeof assignSkillsSchema>;
//# sourceMappingURL=skill.validation.d.ts.map