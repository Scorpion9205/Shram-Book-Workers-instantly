import { z } from "zod";

export const assignSkillsSchema = z.object({
  skillIds: z.array(z.string().uuid()).min(1)
});

export type AssignSkillsInput =
  z.infer<typeof assignSkillsSchema>;