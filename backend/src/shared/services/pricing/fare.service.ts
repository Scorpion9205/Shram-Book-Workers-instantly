import { Prisma } from "@prisma/client";
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
    // Decimal arithmetic throughout — plain `number` math here previously produced
    // float rounding artifacts (e.g. 1099.9890000000001) on non-round rates/worker counts,
    // persisting those artifacts into a financial column downstream.
    let subtotal = new Prisma.Decimal(0);

    for (const item of items) {
      const skill = await this.skillRepo.findById(item.skillId);

      if (!skill) {
        throw new NotFoundException("Skill", item.skillId);
      }

      const rate = new Prisma.Decimal(skill.baseRate?.toString() ?? "400");
      subtotal = subtotal.plus(rate.times(item.requiredWorkers));
    }

    const platformFee = subtotal.times("0.10");
    const total = subtotal.plus(platformFee);

    return {
      subtotal: subtotal.toDecimalPlaces(2).toNumber(),
      platformFee: platformFee.toDecimalPlaces(2).toNumber(),
      total: total.toDecimalPlaces(2).toNumber(),
    };
  }
}