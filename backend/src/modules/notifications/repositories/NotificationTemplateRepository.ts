import { Prisma } from '@prisma/client';
import type { NotificationTemplate } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type { PaginatedResult } from '../../../core/base/BaseRepository.js';
import type { INotificationTemplateRepository } from '../interfaces/INotificationTemplateRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { DatabaseException } from '../../../core/exceptions/index.js';

export class NotificationTemplateRepository extends BaseRepository<NotificationTemplate>
  implements INotificationTemplateRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByTypeChannelLocale(
    type: string,
    channel: string,
    locale: string,
    tx?: Prisma.TransactionClient,
  ): Promise<NotificationTemplate | null> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.notificationTemplate.findUnique({
        where: {
          type_channel_locale: {
            type,
            channel,
            locale,
          },
        },
      });
    } catch (err) {
      throw new DatabaseException('Failed to retrieve notification template by type, channel, locale', err);
    }
  }

  async findMany(
    page: number,
    limit: number,
    tx?: Prisma.TransactionClient,
  ): Promise<PaginatedResult<NotificationTemplate>> {
    const client = tx ?? this.prisma.client;
    const skip = this.buildSkip(page, limit);
    try {
      const [items, total] = await Promise.all([
        client.notificationTemplate.findMany({
          skip,
          take: limit,
          orderBy: { type: 'asc' },
        }),
        client.notificationTemplate.count(),
      ]);
      return this.buildPaginatedResult(items, total, page, limit);
    } catch (err) {
      throw new DatabaseException('Failed to query notification templates list', err);
    }
  }

  async upsert(
    type: string,
    channel: string,
    locale: string,
    data: { subject?: string | null | undefined; body: string; variables?: any },
    tx?: Prisma.TransactionClient,
  ): Promise<NotificationTemplate> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.notificationTemplate.upsert({
        where: {
          type_channel_locale: {
            type,
            channel,
            locale,
          },
        },
        update: {
          subject: data.subject ?? null,
          body: data.body,
          variables: data.variables ?? Prisma.DbNull,
        },
        create: {
          type,
          channel,
          locale,
          subject: data.subject ?? null,
          body: data.body,
          variables: data.variables ?? Prisma.DbNull,
        },
      });
    } catch (err) {
      throw new DatabaseException('Failed to upsert notification template record', err);
    }
  }
}
