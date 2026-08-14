import type { NotificationTemplate } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type { INotificationTemplateRepository } from '../interfaces/INotificationTemplateRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';

export class NotificationTemplateRepository extends BaseRepository<NotificationTemplate> implements INotificationTemplateRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByTypeChannelLocale(
    type: string,
    channel: string,
    locale: string,
  ): Promise<NotificationTemplate | null> {
    return this.prisma.client.notificationTemplate.findUnique({
      where: {
        type_channel_locale: {
          type,
          channel,
          locale,
        },
      },
    });
  }
}
