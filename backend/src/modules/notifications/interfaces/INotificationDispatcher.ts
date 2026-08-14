import { NotificationType, NotificationChannel } from '../enums/NotificationType.js';

export interface DispatchContext {
  type: NotificationType;
  userId: string;
  channels?: NotificationChannel[];
  locale?: string;
  data: Record<string, unknown>;
}

export interface INotificationDispatcher {
  dispatch(ctx: DispatchContext): Promise<void>;
}
