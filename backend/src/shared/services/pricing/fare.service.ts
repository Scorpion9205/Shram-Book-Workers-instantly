import { PrismaService } from "../../../database/prisma/PrismaService.js";
import { SkillRepository } from "../../../modules/pricing/repositories/SkillRepository.js";
import { NotFoundException } from "../../../core/exceptions/index.js";
import { priceBooking, type PricingRates } from "../../pricing/bookingPricing.js";

export class FareService {
  private static skillRepo = new SkillRepository(PrismaService.getInstance());

  // What the provider pays for an instant request: for every worker needed, the skill's rate
  // plus the platform fees. Only this total is shown to the provider.
  static async calculateInstantFare(
    items: {
      skillId: string;
      requiredWorkers: number;
    }[],
    rates: PricingRates,
  ) {
    // Worked out in paise (whole numbers) so there are no floating point leftovers.
    let totalPaise = 0;

    for (const item of items) {
      const skill = await this.skillRepo.findById(item.skillId);

      if (!skill) {
        throw new NotFoundException("Skill", item.skillId);
      }

      const rate = Number(skill.baseRate?.toString() ?? "400");
      const perWorker = priceBooking(rate, rates, false).total;
      totalPaise += Math.round(perWorker * 100) * item.requiredWorkers;
    }

    return { total: totalPaise / 100 };
  }
}
