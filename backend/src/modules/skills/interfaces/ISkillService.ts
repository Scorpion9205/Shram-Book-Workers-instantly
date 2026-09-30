import type { Skill } from '@prisma/client';

export interface ISkillService {
  getSkills(): Promise<Skill[]>;
  assignSkills(userId: string, skillIds: string[]): Promise<Skill[]>;
  getMySkills(userId: string): Promise<Skill[]>;
}
