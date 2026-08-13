---
name: shram-notification-dispatcher
description: >-
  Use this skill when implementing the Notification system in SHRAM:
  NotificationDispatcher, template resolution from DB, multi-channel dispatch
  (email/SMS/push), NotificationTemplate model, and the notification-worker
  RabbitMQ consumer. Activate when: user asks about sending notifications,
  email templates, SMS templates, push notifications, or how to add a new
  notification type.
---

# SHRAM — Notification Dispatcher

## Architecture

```
RabbitMQ notification.queue
         ↓
NotificationConsumer (listener)
         ↓
NotificationDispatcher.dispatch({ type, userId, data })
         ↓
1. Fetch user preferences (channels they want)
2. Resolve NotificationTemplate from DB for (type, channel, locale)
3. Interpolate template variables with `data`
4. Fan out:
   → EmailProvider.send() (Resend)
   → SmsProvider.send()   (Exotel)
   → PushProvider.send()  (Firebase FCM)
5. Log notification record to DB
```

## Notification Types (matches NotificationTemplate.type column)

```typescript
// modules/notifications/enums/NotificationType.ts
export enum NotificationType {
  OTP_LOGIN = 'OTP_LOGIN',
  OTP_WORK_START = 'OTP_WORK_START',
  WELCOME = 'WELCOME',
  BOOKING_CREATED = 'BOOKING_CREATED',
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  WORK_STARTED = 'WORK_STARTED',
  WORK_COMPLETED = 'WORK_COMPLETED',
  PAYMENT_RECEIPT = 'PAYMENT_RECEIPT',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  REVIEW_REQUEST = 'REVIEW_REQUEST',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
}
```

## NotificationDispatcher

```typescript
// modules/notifications/services/NotificationDispatcher.ts
export interface DispatchContext {
  type: NotificationType;
  userId: string;
  channels?: NotificationChannel[]; // if not set, dispatch to user's preferred channels
  locale?: string;
  data: Record<string, unknown>; // template variable values
}

export class NotificationDispatcher implements INotificationDispatcher {
  constructor(
    private readonly templateRepo: INotificationTemplateRepository,
    private readonly userRepo: IUserRepository,
    private readonly notificationRepo: INotificationRepository,
    private readonly emailProvider: IEmailProvider,
    private readonly smsProvider: ISmsProvider,
    private readonly pushProvider: IPushProvider,
    private readonly cache: ICacheService,
  ) {}

  async dispatch(ctx: DispatchContext): Promise<void> {
    const user = await this.userRepo.findById(ctx.userId);
    if (!user) return; // silently skip if user not found

    const channels = ctx.channels ?? this.getDefaultChannels(ctx.type);
    const locale = ctx.locale ?? 'en';

    await Promise.allSettled(
      channels.map(channel => this.dispatchToChannel(ctx, user, channel, locale))
    );
  }

  private async dispatchToChannel(
    ctx: DispatchContext,
    user: User,
    channel: NotificationChannel,
    locale: string,
  ): Promise<void> {
    const template = await this.resolveTemplate(ctx.type, channel, locale);
    if (!template) {
      Logger.warn('No template found', { type: ctx.type, channel, locale });
      return;
    }

    const body = this.interpolate(template.body, ctx.data);
    const subject = template.subject ? this.interpolate(template.subject, ctx.data) : undefined;

    try {
      switch (channel) {
        case NotificationChannel.EMAIL:
          if (user.email) await this.emailProvider.send(user.email, subject!, body);
          break;
        case NotificationChannel.SMS:
          if (user.phone) await this.smsProvider.send(user.phone, body);
          break;
        case NotificationChannel.PUSH:
          // get FCM token from user's device tokens
          const fcmTokens = await this.getUserFCMTokens(user.id);
          if (fcmTokens.length) await this.pushProvider.sendMulticast(fcmTokens, subject!, body, ctx.data);
          break;
      }

      await this.logNotification(user.id, ctx.type, channel, 'SENT');
    } catch (error) {
      Logger.error('Notification dispatch failed', { type: ctx.type, channel, userId: user.id, error });
      await this.logNotification(user.id, ctx.type, channel, 'FAILED');
    }
  }

  private async resolveTemplate(
    type: NotificationType,
    channel: NotificationChannel,
    locale: string,
  ): Promise<NotificationTemplate | null> {
    const cacheKey = `notification:template:${type}:${channel}:${locale}`;
    const cached = await this.cache.get<NotificationTemplate>(cacheKey);
    if (cached) return cached;

    const template = await this.templateRepo.findByTypeChannelLocale(type, channel, locale);
    if (template) await this.cache.set(cacheKey, template, 300); // 5 min cache
    return template;
  }

  private interpolate(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(data[key] ?? `{{${key}}}`));
  }

  private getDefaultChannels(type: NotificationType): NotificationChannel[] {
    // Which channels are used by default for each notification type
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
```

## Template Interpolation Syntax

Templates in DB use `{{variableName}}` syntax:

```
// OTP_LOGIN email body:
"Your SHRAM login OTP is {{otp}}. It expires in {{expiryMinutes}} minutes. Do not share."

// BOOKING_CONFIRMED SMS body:
"Hi {{providerName}}, your booking #{{bookingShortId}} is confirmed. Worker {{workerName}} will arrive at {{scheduledTime}}."

// OTP_WORK_START SMS:
"SHRAM: Your work-start OTP for booking #{{bookingShortId}} is {{otp}}. Share this with the worker to begin."
```

## Admin Template CRUD

Admins manage templates via `/admin/notification-templates`:
- `GET /admin/notification-templates` — list all
- `PUT /admin/notification-templates/:type/:channel/:locale` — upsert template body/subject
- Templates are cached in Redis (5 min TTL) — cache invalidated on update
