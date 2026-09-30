import type { ISkillRepository } from "../interfaces/ISkillRepository.js";
import type { ISkillService } from "../interfaces/ISkillService.js";
import { BadRequestException } from "../../../core/exceptions/index.js";

export class SkillService implements ISkillService {
  constructor(private readonly skillRepo: ISkillRepository) {}

  async getSkills() {
    return this.skillRepo.findAllSkills();
  }

  async assignSkills(userId: string, skillIds: string[]) {
    const uniqueSkillIds = Array.from(new Set(skillIds));

    const worker = await this.skillRepo.upsertWorkerProfile(userId);

    const skills = await this.skillRepo.findSkillsByIds(uniqueSkillIds);

    if (skills.length !== uniqueSkillIds.length) {
      throw new BadRequestException("Invalid skill selected");
    }

    await this.skillRepo.replaceWorkerSkills(worker.id, uniqueSkillIds);

    return this.skillRepo.findWorkerSkillsWithDetails(worker.id);
  }

  async getMySkills(userId: string) {
    const worker = await this.skillRepo.upsertWorkerProfile(userId);
    return this.skillRepo.findWorkerSkillsWithDetails(worker.id);
  }
}
