import type { PricingRule, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { NotFoundException } from '../../../core/exceptions/index.js';
import type { IPricingRuleRepository, UpsertPricingRuleData, PricingRuleWithSkill } from '../interfaces/IPricingRuleRepository.js';

export class PricingRuleRepository implements IPricingRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBySkillId(skillId: string): Promise<PricingRule | null> {
    return this.prisma.client.pricingRule.findUnique({ where: { skillId } });
  }

  async findAll(): Promise<PricingRuleWithSkill[]> {
    return this.prisma.client.pricingRule.findMany({
      include: { skill: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async upsert(skillId: string, data: UpsertPricingRuleData): Promise<PricingRule> {
    try {
      return await this.prisma.client.pricingRule.upsert({
        where: { skillId },
        update: { ...(data.minFare !== undefined && { minFare: data.minFare }), ...(data.maxFare !== undefined && { maxFare: data.maxFare }) },
        create: { skillId, minFare: data.minFare ?? null, maxFare: data.maxFare ?? null },
      });
    } catch (err) {
      if ((err as Prisma.PrismaClientKnownRequestError)?.code === 'P2003') {
        throw new NotFoundException('Skill', skillId);
      }
      throw err;
    }
  }

  async delete(skillId: string): Promise<void> {
    await this.prisma.client.pricingRule.delete({ where: { skillId } });
  }
}
