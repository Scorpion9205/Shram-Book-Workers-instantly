import type { Request, Response } from 'express';
import { BaseController } from '../../../core/base/BaseController.js';
import type { INotificationRepository } from '../interfaces/INotificationRepository.js';
import { BusinessException } from '../../../core/exceptions/index.js';

export class NotificationController extends BaseController {
  constructor(private readonly notificationRepo: INotificationRepository) {
    super();
  }

  getMyNotifications = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const notifications = await this.notificationRepo.findManyByUserId(user.userId);
    this.ok(res, notifications, 'Notifications retrieved successfully.');
  };

  markAsRead = async (req: Request, res: Response): Promise<void> => {
    const notificationId = req.params.notificationId as string;
    if (!notificationId) {
      throw new BusinessException('INVALID_NOTIFICATION_ID', 'Invalid notification id');
    }
    const notification = await this.notificationRepo.markAsRead(notificationId);
    this.ok(res, notification, 'Notification marked as read successfully.');
  };
}
