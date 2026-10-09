import type { PricingRule } from '@prisma/client';

export interface UpsertPricingRuleData {
  minFare?: number | null;
  maxFare?: number | null;
}

export interface PricingRuleWithSkill extends PricingRule {
  skill: { name: string };
}

export interface IPricingRuleRepository {
  findBySkillId(skillId: string): Promise<PricingRule | null>;
  findAll(): Promise<PricingRuleWithSkill[]>;
  upsert(skillId: string, data: UpsertPricingRuleData): Promise<PricingRule>;
  delete(skillId: string): Promise<void>;
}
