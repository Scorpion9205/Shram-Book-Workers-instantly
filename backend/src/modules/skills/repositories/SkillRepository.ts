import type { Skill } from '@prisma/client';
import { PrismaService } from "../../../database/prisma/PrismaService.js";
import type { ISkillRepository } from "../interfaces/ISkillRepository.js";

export class SkillRepository implements ISkillRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllSkills(): Promise<Skill[]> {
    return this.prisma.client.skill.findMany({
      orderBy: { name: "asc" },
      include: { category: true },
    });
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
    // Atomic — without a transaction, a failure between the delete and the create (a transient
    // DB error, or a skillId deleted by another process in that exact window) leaves the worker
    // with zero skills and no way to recover except re-submitting, since the delete had already
    // committed on its own.
    await this.prisma.client.$transaction([
      this.prisma.client.workerSkill.deleteMany({ where: { workerId } }),
      this.prisma.client.workerSkill.createMany({
        data: skillIds.map((skillId) => ({ workerId, skillId })),
      }),
    ]);
  }

  async findWorkerSkillsWithDetails(workerId: string): Promise<Skill[]> {
    const workerSkills = await this.prisma.client.workerSkill.findMany({
      where: { workerId },
      include: { skill: true },
    });
    return workerSkills.map((item) => item.skill);
  }
}
