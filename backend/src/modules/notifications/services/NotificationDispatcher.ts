import { BaseService } from '../../../core/base/BaseService.js';
import type { INotificationDispatcher, DispatchContext } from '../interfaces/INotificationDispatcher.js';
import type { INotificationTemplateRepository } from '../interfaces/INotificationTemplateRepository.js';
import type { INotificationRepository } from '../interfaces/INotificationRepository.js';
import type { IUserRepository } from '../../users/interfaces/IUserRepository.js';
import type { IEmailProvider, ISmsProvider, IPushProvider } from '../../../core/interfaces/IProviders.js';
import type { ICacheService } from '../../../core/interfaces/ICacheService.js';
import { NotificationType, NotificationChannel } from '../enums/NotificationType.js';
import { BusinessException } from '../../../core/exceptions/index.js';
import React from 'react';
import { renderEmail } from '../../../shared/email/utils/render-email.js';
import {
  OtpEmail,
  WelcomeEmail,
  BookingCreated,
  BookingConfirmed,
  WorkCompleted,
  PaymentReceipt,
  BookingCancelled,
} from '../../../shared/email/templates/index.js';

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

    const results = await Promise.allSettled(
      channels.map(channel => this.dispatchToChannel(ctx, user, channel, locale))
    );

    const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failures.length > 0) {
      this.log('One or more notification channels failed', {
        type: ctx.type,
        userId: ctx.userId,
        failedChannels: failures.length,
        totalChannels: channels.length,
      });
    }

    // If every channel failed, the user received nothing at all — surface this as a real
    // failure so the RabbitMQ consumer nacks (and, with a DLX bound, can retry/investigate)
    // instead of acking a message that silently delivered nothing.
    if (failures.length === channels.length && channels.length > 0) {
      throw new BusinessException(
        'NOTIFICATION_DELIVERY_FAILED',
        `All ${channels.length} channel(s) failed for notification type ${ctx.type}`,
      );
    }
  }

  private async dispatchToChannel(
    ctx: DispatchContext,
    user: any,
    channel: NotificationChannel,
    locale: string,
  ): Promise<void> {
    if (channel === NotificationChannel.EMAIL) {
      if (user.email) {
        try {
          let component: React.ReactElement | null = null;
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

          switch (ctx.type) {
            case NotificationType.OTP_LOGIN:
              component = React.createElement(OtpEmail, {
                name: (ctx.data.name as string) || user.name || 'User',
                otp: (ctx.data.otp as string) || '',
              });
              break;
            case NotificationType.WELCOME:
              component = React.createElement(WelcomeEmail, {
                name: (ctx.data.name as string) || user.name || 'User',
              });
              break;
            case NotificationType.BOOKING_CREATED:
              component = React.createElement(BookingCreated, {
                name: (ctx.data.name as string) || user.name || 'User',
                bookingId: (ctx.data.bookingId as string) || '',
                frontendUrl,
              });
              break;
            case NotificationType.BOOKING_CONFIRMED:
              component = React.createElement(BookingConfirmed, {
                providerName: (ctx.data.providerName as string) || user.name || 'User',
                bookingShortId: (ctx.data.bookingShortId as string) || (ctx.data.bookingId as string) || '',
                workerName: (ctx.data.workerName as string) || '',
                frontendUrl,
              });
              break;
            case NotificationType.WORK_COMPLETED:
              component = React.createElement(WorkCompleted, {
                providerName: (ctx.data.providerName as string) || user.name || 'User',
                workerName: (ctx.data.workerName as string) || '',
                bookingShortId: (ctx.data.bookingShortId as string) || (ctx.data.bookingId as string) || '',
                frontendUrl,
              });
              break;
            case NotificationType.PAYMENT_RECEIPT:
              component = React.createElement(PaymentReceipt, {
                providerName: (ctx.data.providerName as string) || user.name || 'User',
                bookingShortId: (ctx.data.bookingShortId as string) || (ctx.data.bookingId as string) || '',
                workerName: (ctx.data.workerName as string) || '',
                amount: String(ctx.data.amount || ''),
                frontendUrl,
              });
              break;
            case NotificationType.BOOKING_CANCELLED:
              component = React.createElement(BookingCancelled, {
                bookingShortId: (ctx.data.bookingShortId as string) || (ctx.data.bookingId as string) || '',
                reason: (ctx.data.reason as string) || 'No reason provided',
                frontendUrl,
              });
              break;
          }

          if (component) {
            const body = await renderEmail(component);
            const subject = this.getEmailSubject(ctx.type, ctx.data);
            await this.emailProvider.send(user.email, subject, body);
            await this.notificationRepo.create(user.id, subject, body);
            return;
          }
        } catch (error) {
          this.log('Dynamic email template compilation failed, falling back to DB templates', { type: ctx.type, userId: user.id, error });
        }
      }
    }

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
      throw error;
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

  private getEmailSubject(type: NotificationType, data: Record<string, unknown>): string {
    const defaults: Record<NotificationType, string> = {
      [NotificationType.OTP_LOGIN]: 'Your SHRAM Verification Code',
      [NotificationType.WELCOME]: 'Welcome to SHRAM 🎉',
      [NotificationType.BOOKING_CREATED]: 'SHRAM: New Booking Created',
      [NotificationType.BOOKING_CONFIRMED]: 'SHRAM: Booking Confirmed!',
      [NotificationType.WORK_STARTED]: 'SHRAM: Work Started',
      [NotificationType.WORK_COMPLETED]: 'SHRAM: Work Completed Alert',
      [NotificationType.PAYMENT_RECEIPT]: 'Receipt for SHRAM Booking',
      [NotificationType.BOOKING_CANCELLED]: 'SHRAM: Booking Cancelled',
      [NotificationType.REVIEW_REQUEST]: 'SHRAM: Review Request',
      [NotificationType.OTP_WORK_START]: 'SHRAM: Work Start OTP',
    };

    const raw = defaults[type] || 'SHRAM Alert';
    return this.interpolate(raw, data);
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
