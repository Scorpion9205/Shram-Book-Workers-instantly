import type { Skill } from '@prisma/client';
import { PrismaService } from "../../../database/prisma/PrismaService.js";
import type { ISkillRepository } from "../interfaces/ISkillRepository.js";

export class SkillRepository implements ISkillRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllSkills(): Promise<Skill[]> {
    return this.prisma.client.skill.findMany({ orderBy: { name: "asc" } });
  }

  async upsertWorkerProfile(userId: string): Promise<{ id: string }> {
    return this.prisma.client.workerProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
      select: { id: true },
    });
  }

  async findSkillsByIds(skillIds: string[]): Promise<Skill[]> {
    return this.prisma.client.skill.findMany({ where: { id: { in: skillIds } } });
  }

  async replaceWorkerSkills(workerId: string, skillIds: string[]): Promise<void> {
    await this.prisma.client.workerSkill.deleteMany({ where: { workerId } });
    await this.prisma.client.workerSkill.createMany({
      data: skillIds.map((skillId) => ({ workerId, skillId })),
    });
  }

  async findWorkerSkillsWithDetails(workerId: string): Promise<Skill[]> {
    const workerSkills = await this.prisma.client.workerSkill.findMany({
      where: { workerId },
      include: { skill: true },
    });
    return workerSkills.map((item) => item.skill);
  }
}
