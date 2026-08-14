import type { NotificationTemplate } from '@prisma/client';

export interface INotificationTemplateRepository {
  findByTypeChannelLocale(
    type: string,
    channel: string,
    locale: string,
  ): Promise<NotificationTemplate | null>;
}
