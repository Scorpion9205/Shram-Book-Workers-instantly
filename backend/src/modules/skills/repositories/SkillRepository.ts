import { BaseRepository } from '../../../core/base/BaseRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import type { Skill, WorkerProfile } from '@prisma/client';

export class SkillRepository extends BaseRepository<Skill> {
  constructor(private readonly prisma: PrismaService = PrismaService.getInstance()) {
    super();
  }

  async findAllOrderedByName(): Promise<Skill[]> {
    return this.prisma.client.skill.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findManyByIds(ids: string[]): Promise<Skill[]> {
    return this.prisma.client.skill.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  async upsertWorkerProfile(userId: string): Promise<WorkerProfile> {
    return this.prisma.client.workerProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async assignWorkerSkills(workerId: string, uniqueSkillIds: string[]): Promise<Skill[]> {
    return this.prisma.transaction(async (tx) => {
      await tx.workerSkill.deleteMany({
        where: { workerId },
      });

      await tx.workerSkill.createMany({
        data: uniqueSkillIds.map((skillId) => ({
          workerId,
          skillId,
        })),
      });

      const workerSkills = await tx.workerSkill.findMany({
        where: { workerId },
        include: { skill: true },
      });

      return workerSkills.map((ws) => ws.skill);
    });
  }

  async getWorkerSkills(workerId: string): Promise<Skill[]> {
    const workerSkills = await this.prisma.client.workerSkill.findMany({
      where: { workerId },
      include: { skill: true },
    });

    return workerSkills.map((ws) => ws.skill);
  }
}
