import type { NotificationTemplate, Prisma } from '@prisma/client';
import type { PaginatedResult } from '../../../core/base/BaseRepository.js';

export interface INotificationTemplateRepository {
  findByTypeChannelLocale(
    type: string,
    channel: string,
    locale: string,
    tx?: Prisma.TransactionClient,
  ): Promise<NotificationTemplate | null>;
  findMany(
    page: number,
    limit: number,
    tx?: Prisma.TransactionClient,
  ): Promise<PaginatedResult<NotificationTemplate>>;
  upsert(
    type: string,
    channel: string,
    locale: string,
    data: { subject?: string | null | undefined; body: string; variables?: any },
    tx?: Prisma.TransactionClient,
  ): Promise<NotificationTemplate>;
}
