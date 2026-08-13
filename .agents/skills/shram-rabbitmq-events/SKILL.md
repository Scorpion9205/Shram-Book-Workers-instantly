---
name: shram-rabbitmq-events
description: >-
  Use this skill when implementing RabbitMQ event publishing and consuming in
  SHRAM: EventPublisher, consumer workers, exchange/queue setup, and the
  notification-worker fanout pattern. Activate when: user asks about async
  events, RabbitMQ setup, publishing domain events, building notification
  consumers, or decoupling side-effects from services.
---

# SHRAM — RabbitMQ Event Architecture

## Architecture

```
Service publishes event → EventPublisher → Exchange
                                              ↓
         ┌────────────────────────────────────┤
         ↓                    ↓               ↓
  notification-worker   analytics-worker   cleanup-worker
  (email/sms/push)      (reporting)        (expired IRs)
```

## RabbitMQ Bootstrap

```typescript
// bootstrap/rabbitmq.bootstrap.ts
import amqp from 'amqplib';
import { env } from '../config/env.js';

export async function bootstrapRabbitMQ(): Promise<amqp.Connection> {
  const connection = await amqp.connect(env.RABBITMQ_URL);
  const channel = await connection.createChannel();

  // Exchanges
  await channel.assertExchange('shram.events', 'topic', { durable: true });
  await channel.assertExchange('shram.dlx', 'fanout', { durable: true }); // dead-letter

  // Queues
  await channel.assertQueue('notification.queue', {
    durable: true,
    arguments: { 'x-dead-letter-exchange': 'shram.dlx' },
  });
  await channel.assertQueue('analytics.queue', { durable: true });
  await channel.assertQueue('cleanup.queue', { durable: true });

  // Bindings — routing keys
  await channel.bindQueue('notification.queue', 'shram.events', 'booking.#');
  await channel.bindQueue('notification.queue', 'shram.events', 'payment.#');
  await channel.bindQueue('notification.queue', 'shram.events', 'review.#');
  await channel.bindQueue('notification.queue', 'shram.events', 'user.registered');
  await channel.bindQueue('analytics.queue', 'shram.events', '#');
  await channel.bindQueue('cleanup.queue', 'shram.events', 'instant_request.#');

  return connection;
}
```

## EventPublisher

```typescript
// queues/EventPublisher.ts
import amqp from 'amqplib';

export interface IEventPublisher {
  publish(routingKey: string, payload: object): Promise<void>;
}

export class RabbitMQEventPublisher implements IEventPublisher {
  private channel: amqp.Channel | null = null;

  constructor(private readonly connection: amqp.Connection) {}

  async init(): Promise<void> {
    this.channel = await this.connection.createChannel();
    this.channel.on('error', (err) => Logger.error('RabbitMQ channel error', err));
    this.channel.on('close', () => Logger.warn('RabbitMQ channel closed'));
  }

  async publish(routingKey: string, payload: object): Promise<void> {
    if (!this.channel) throw new Error('RabbitMQ channel not initialized');

    const message = Buffer.from(JSON.stringify({
      ...payload,
      _meta: { publishedAt: new Date().toISOString(), routingKey },
    }));

    const sent = this.channel.publish('shram.events', routingKey, message, {
      persistent: true,     // survives broker restart
      contentType: 'application/json',
    });

    if (!sent) {
      Logger.warn('RabbitMQ channel buffer full', { routingKey });
    }
  }
}
```

## Notification Consumer Worker

```typescript
// queues/consumers/NotificationConsumer.ts
export class NotificationConsumer {
  constructor(
    private readonly channel: amqp.Channel,
    private readonly notificationDispatcher: INotificationDispatcher,
  ) {}

  async start(): Promise<void> {
    this.channel.prefetch(10); // process max 10 messages concurrently

    await this.channel.consume('notification.queue', async (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString());
        await this.handleEvent(payload._meta.routingKey, payload);
        this.channel.ack(msg);
      } catch (error) {
        Logger.error('Notification consumer error', error);
        // nack with requeue=false → goes to DLX
        this.channel.nack(msg, false, false);
      }
    });
  }

  private async handleEvent(routingKey: string, payload: any): Promise<void> {
    switch (routingKey) {
      case 'booking.status_changed':
        await this.handleBookingStatusChanged(payload);
        break;
      case 'booking.created':
        await this.notificationDispatcher.dispatch({
          type: NotificationType.BOOKING_CREATED,
          userId: payload.providerId,
          data: payload,
        });
        break;
      case 'user.registered':
        await this.notificationDispatcher.dispatch({
          type: NotificationType.WELCOME,
          userId: payload.userId,
          data: payload,
        });
        break;
      default:
        Logger.warn('Unknown routing key in notification consumer', { routingKey });
    }
  }

  private async handleBookingStatusChanged(payload: BookingStatusChangedPayload): Promise<void> {
    const typeMap: Partial<Record<string, NotificationType>> = {
      PAYMENT_CONFIRMED: NotificationType.BOOKING_CONFIRMED,
      WORK_STARTED: NotificationType.WORK_STARTED,
      WORK_COMPLETED: NotificationType.WORK_COMPLETED,
      CANCELLED_BY_PROVIDER: NotificationType.BOOKING_CANCELLED,
      CANCELLED_BY_WORKER: NotificationType.BOOKING_CANCELLED,
    };

    const type = typeMap[payload.toStatus];
    if (!type) return;

    await this.notificationDispatcher.dispatch({
      type,
      userId: payload.providerId,
      data: payload,
    });
  }
}
```

## Event Constants

```typescript
// queues/queue.constants.ts
export const QueueNames = {
  NOTIFICATION: 'notification.queue',
  ANALYTICS: 'analytics.queue',
  CLEANUP: 'cleanup.queue',
} as const;

export const ExchangeNames = {
  EVENTS: 'shram.events',
  DLX: 'shram.dlx',
} as const;

export const RoutingKeys = {
  BOOKING_CREATED: 'booking.created',
  BOOKING_STATUS_CHANGED: 'booking.status_changed',
  PAYMENT_SUCCESS: 'payment.success',
  INSTANT_REQUEST_ACCEPTED: 'instant_request.accepted',
  BID_SUBMITTED: 'bid.submitted',
  REVIEW_SUBMITTED: 'review.submitted',
  USER_REGISTERED: 'user.registered',
  OTP_SENT: 'otp.sent',
} as const;
```
