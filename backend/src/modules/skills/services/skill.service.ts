import { SkillRepository } from "../repositories/SkillRepository.js";
import { BadRequestException } from "../../../core/exceptions/index.js";

const skillRepository = new SkillRepository();

export class SkillService {
  static async getSkills() {
    return await skillRepository.findAllOrderedByName();
  }

  static async assignSkills(userId: string, skillIds: string[]) {
    const uniqueSkillIds = Array.from(new Set(skillIds));
    const worker = await skillRepository.upsertWorkerProfile(userId);

    const skills = await skillRepository.findManyByIds(uniqueSkillIds);

    if (skills.length !== uniqueSkillIds.length) {
      throw new BadRequestException("Invalid skill selected");
    }

    return await skillRepository.assignWorkerSkills(worker.id, uniqueSkillIds);
  }

  static async getMySkills(userId: string) {
    const worker = await skillRepository.upsertWorkerProfile(userId);
    return await skillRepository.getWorkerSkills(worker.id);
  }
}
