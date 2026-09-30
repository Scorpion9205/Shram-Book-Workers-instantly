import type { Skill } from '@prisma/client';

export interface ISkillRepository {
  findAllSkills(): Promise<Skill[]>;
  upsertWorkerProfile(userId: string): Promise<{ id: string }>;
  findSkillsByIds(skillIds: string[]): Promise<Skill[]>;
  replaceWorkerSkills(workerId: string, skillIds: string[]): Promise<void>;
  findWorkerSkillsWithDetails(workerId: string): Promise<Skill[]>;
}
