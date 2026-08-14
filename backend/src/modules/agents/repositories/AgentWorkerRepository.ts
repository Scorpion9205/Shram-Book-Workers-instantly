import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type { IAgentWorkerRepository } from '../interfaces/IAgentWorkerRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';

export class AgentWorkerRepository extends BaseRepository<any> implements IAgentWorkerRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async countByAgentId(agentId: string): Promise<number> {
    return this.prisma.client.agentWorker.count({
      where: { agentId },
    });
  }

  async countAvailableByAgentId(agentId: string): Promise<number> {
    return this.prisma.client.agentWorker.count({
      where: {
        agentId,
        worker: {
          isAvailable: true,
        },
      },
    });
  }

  async findManyByAgentId(agentId: string): Promise<any[]> {
    return this.prisma.client.agentWorker.findMany({
      where: { agentId },
      include: {
        worker: {
          include: {
            skills: true,
          },
        },
      },
    });
  }
}
