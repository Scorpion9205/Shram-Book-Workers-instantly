import { z } from "zod";

export const assignSkillsSchema = z
  .object({
    skillId: z.string().optional(),
    skillIds: z.array(z.string()).optional(),
  })
  .transform((data) => ({
    skillIds: Array.from(
      new Set([
        ...(data.skillIds ?? []),
        ...(data.skillId ? [data.skillId] : []),
      ])
    ),
  }))
  .refine((data) => data.skillIds.length > 0, {
    message: "At least one skill is required",
    path: ["skillIds"],
  });

export type AssignSkillsInput =
  z.infer<typeof assignSkillsSchema>;
