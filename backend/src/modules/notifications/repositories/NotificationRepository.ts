import type { Notification } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type { INotificationRepository } from '../interfaces/INotificationRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';

export class NotificationRepository extends BaseRepository<Notification> implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(userId: string, title: string, message: string): Promise<Notification> {
    return this.prisma.client.notification.create({
      data: {
        userId,
        title,
        message,
        isRead: false,
      },
    });
  }

  async findManyByUserId(userId: string): Promise<Notification[]> {
    return this.prisma.client.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    const notification = await this.prisma.client.notification.findFirst({ where: { id, userId } });
    if (!notification) {
      return null;
    }

    return this.prisma.client.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }
}
