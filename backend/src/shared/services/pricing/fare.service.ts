import { PrismaService } from "../../../database/prisma/PrismaService.js";
import { SkillRepository } from "../../../modules/pricing/repositories/SkillRepository.js";
import { NotFoundException } from "../../../core/exceptions/index.js";

export class FareService {
  private static skillRepo = new SkillRepository(PrismaService.getInstance());

  static async calculateInstantFare(
    items: {
      skillId: string;
      requiredWorkers: number;
    }[]
  ) {
    let subtotal = 0;

    for (const item of items) {
      const skill = await this.skillRepo.findById(item.skillId);

      if (!skill) {
        throw new NotFoundException("Skill", item.skillId);
      }

      const rate = Number(skill.baseRate || 400);
      subtotal += rate * item.requiredWorkers;
    }

    const platformFee = subtotal * 0.10;
    const total = subtotal + platformFee;

    return {
      subtotal,
      platformFee,
      total,
    };
  }
}