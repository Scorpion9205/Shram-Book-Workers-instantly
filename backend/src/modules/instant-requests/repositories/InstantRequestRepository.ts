import { BaseRepository } from '../../../core/base/BaseRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import type { InstantRequest } from '@prisma/client';

export class InstantRequestRepository extends BaseRepository<InstantRequest> {
  constructor(private readonly prisma: PrismaService = PrismaService.getInstance()) {
    super();
  }

  async findExpiredOpenRequests(): Promise<{ id: string }[]> {
    return this.prisma.client.instantRequest.findMany({
      where: {
        status: 'OPEN',
        expiresAt: {
          lt: new Date(),
        },
      },
      select: {
        id: true,
      },
    });
  }

  async markExpired(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.prisma.client.instantRequest.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });
  }
}
