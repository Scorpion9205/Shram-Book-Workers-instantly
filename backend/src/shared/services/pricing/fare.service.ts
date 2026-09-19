import { PrismaService } from "../../../database/prisma/PrismaService.js";
import { SkillRepository } from "../../../modules/pricing/repositories/SkillRepository.js";
import { PlatformSettingRepository } from "../../../modules/platform-settings/repositories/PlatformSettingRepository.js";
import { NotFoundException } from "../../../core/exceptions/index.js";

export class FareService {
  private static skillRepo = new SkillRepository(PrismaService.getInstance());
  private static platformSettingRepo = new PlatformSettingRepository(PrismaService.getInstance());

  static async calculateInstantFare(
    items: {
      skillId: string;
      requiredWorkers: number;
    }[]
  ) {
    const defaultBaseRateSetting = await this.platformSettingRepo.get('DEFAULT_SKILL_BASE_RATE');
    const defaultBaseRate = defaultBaseRateSetting ? Number(defaultBaseRateSetting.value) : 400;

    let subtotal = 0;

    for (const item of items) {
      const skill = await this.skillRepo.findById(item.skillId);

      if (!skill) {
        throw new NotFoundException("Skill", item.skillId);
      }

      const rate = Number(skill.baseRate || defaultBaseRate);
      subtotal += rate * item.requiredWorkers;
    }

    const platformFeeSetting = await this.platformSettingRepo.get('PLATFORM_FEE_PERCENTAGE');
    const platformFeePercentage = platformFeeSetting ? Number(platformFeeSetting.value) : 10;

    const platformFee = subtotal * (platformFeePercentage / 100);
    const total = subtotal + platformFee;

    return {
      subtotal,
      platformFee,
      total,
    };
  }
}