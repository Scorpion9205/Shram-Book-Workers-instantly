import { BaseRepository } from '../../../core/base/BaseRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { DatabaseException } from '../../../core/exceptions/index.js';
import { ISkillRepository } from '../interfaces/IPricingStrategy.js';

export class SkillRepository extends BaseRepository<any> implements ISkillRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<any | null> {
    try {
      return await this.prisma.client.skill.findUnique({
        where: { id },
      });
    } catch (err) {
      throw new DatabaseException(`Failed to retrieve skill by ID: ${id}`, err);
    }
  }
}
