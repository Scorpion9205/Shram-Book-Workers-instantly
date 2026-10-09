import type { Notification } from '@prisma/client';

export interface INotificationRepository {
  create(userId: string, title: string, message: string): Promise<Notification>;
  findManyByUserId(userId: string): Promise<Notification[]>;
  markAsRead(id: string, userId: string): Promise<Notification | null>;
}
