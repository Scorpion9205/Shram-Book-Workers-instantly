import { BaseService } from '../../../core/base/BaseService.js';
import type { INotificationDispatcher, DispatchContext } from '../interfaces/INotificationDispatcher.js';
import type { INotificationTemplateRepository } from '../interfaces/INotificationTemplateRepository.js';
import type { INotificationRepository } from '../interfaces/INotificationRepository.js';
import type { IUserRepository } from '../../users/interfaces/IUserRepository.js';
import type { IEmailProvider, ISmsProvider, IPushProvider } from '../../../core/interfaces/IProviders.js';
import type { ICacheService } from '../../../core/interfaces/ICacheService.js';
import { NotificationType, NotificationChannel } from '../enums/NotificationType.js';

export class NotificationDispatcher extends BaseService implements INotificationDispatcher {
  constructor(
    private readonly templateRepo: INotificationTemplateRepository,
    private readonly userRepo: IUserRepository,
    private readonly notificationRepo: INotificationRepository,
    private readonly emailProvider: IEmailProvider,
    private readonly smsProvider: ISmsProvider,
    private readonly pushProvider: IPushProvider,
    private readonly cache: ICacheService,
  ) {
    super('NotificationDispatcher');
  }

  async dispatch(ctx: DispatchContext): Promise<void> {
    this.log('Dispatching notification', { type: ctx.type, userId: ctx.userId });
    const user = await this.userRepo.findById(ctx.userId);
    if (!user) {
      this.log('User not found for notification dispatch', { userId: ctx.userId });
      return;
    }

    const channels = ctx.channels ?? this.getDefaultChannels(ctx.type);
    const locale = ctx.locale ?? 'en';

    await Promise.allSettled(
      channels.map(channel => this.dispatchToChannel(ctx, user, channel, locale))
    );
  }

  private async dispatchToChannel(
    ctx: DispatchContext,
    user: any,
    channel: NotificationChannel,
    locale: string,
  ): Promise<void> {
    const template = await this.resolveTemplate(ctx.type, channel, locale);
    if (!template) {
      this.log('No template found', { type: ctx.type, channel, locale });
      return;
    }

    const body = this.interpolate(template.body, ctx.data);
    const subject = template.subject ? this.interpolate(template.subject, ctx.data) : undefined;

    try {
      switch (channel) {
        case NotificationChannel.EMAIL:
          if (user.email) {
            await this.emailProvider.send(user.email, subject || 'SHRAM Alert', body);
          }
          break;
        case NotificationChannel.SMS:
          if (user.phone) {
            await this.smsProvider.send(user.phone, body);
          }
          break;
        case NotificationChannel.PUSH:
          const fcmTokens = await this.getUserFCMTokens(user.id);
          if (fcmTokens.length > 0) {
            const dataString: Record<string, string> = {};
            for (const [k, v] of Object.entries(ctx.data)) {
              dataString[k] = String(v);
            }
            await this.pushProvider.sendMulticast(fcmTokens, subject || 'SHRAM Alert', body, dataString);
          } else {
            this.log('No FCM tokens registered for user, warning/mock dispatching push notification', {
              userId: user.id,
              title: subject || 'SHRAM Alert',
              body,
            });
            await this.pushProvider.send('MOCK_TOKEN', subject || 'SHRAM Alert', body);
          }
          break;
      }

      await this.notificationRepo.create(user.id, subject || ctx.type, body);
    } catch (error) {
      this.log('Notification dispatch failed', { type: ctx.type, channel, userId: user.id, error });
    }
  }

  private async resolveTemplate(
    type: NotificationType,
    channel: NotificationChannel,
    locale: string,
  ): Promise<any | null> {
    const cacheKey = `notification:template:${type}:${channel}:${locale}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const template = await this.templateRepo.findByTypeChannelLocale(type, channel, locale);
    if (template) {
      await this.cache.set(cacheKey, template, 300); // 5 min cache
    }
    return template;
  }

  private interpolate(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(data[key] ?? `{{${key}}}`));
  }

  private async getUserFCMTokens(userId: string): Promise<string[]> {
    return [];
  }

  private getDefaultChannels(type: NotificationType): NotificationChannel[] {
    const defaults: Record<NotificationType, NotificationChannel[]> = {
      [NotificationType.OTP_LOGIN]: [NotificationChannel.EMAIL, NotificationChannel.SMS],
      [NotificationType.OTP_WORK_START]: [NotificationChannel.SMS],
      [NotificationType.WELCOME]: [NotificationChannel.EMAIL],
      [NotificationType.BOOKING_CREATED]: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
      [NotificationType.BOOKING_CONFIRMED]: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.PUSH],
      [NotificationType.WORK_STARTED]: [NotificationChannel.PUSH],
      [NotificationType.WORK_COMPLETED]: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
      [NotificationType.PAYMENT_RECEIPT]: [NotificationChannel.EMAIL],
      [NotificationType.BOOKING_CANCELLED]: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.PUSH],
      [NotificationType.REVIEW_REQUEST]: [NotificationChannel.PUSH],
    };
    return defaults[type] ?? [NotificationChannel.EMAIL];
  }
}
