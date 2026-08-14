import type * as amqp from 'amqplib';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { Logger } from '../../../core/logger/Logger.js';

export class CleanupConsumer {
  private readonly logger = new Logger('CleanupConsumer');

  constructor(
    private readonly channel: amqp.Channel,
    private readonly prisma: PrismaService,
  ) {}

  async start(): Promise<void> {
    this.logger.info('Starting Cleanup Queue Consumer...');
    this.channel.prefetch(10);

    await this.channel.consume('cleanup.queue', async (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString());
        await this.handleEvent(payload._meta.routingKey, payload);
        this.channel.ack(msg);
      } catch (error) {
        this.logger.error('Cleanup consumer error during processing', error);
        this.channel.nack(msg, false, false);
      }
    });
  }

  private async handleEvent(routingKey: string, payload: any): Promise<void> {
    if (routingKey === 'instant_request.expired') {
      const requestId = payload.requestId;
      this.logger.info(`Cleaning up expired instant request ${requestId}`);

      await this.prisma.client.instantRequest.updateMany({
        where: {
          id: requestId,
          status: 'OPEN',
        },
        data: {
          status: 'EXPIRED',
        },
      });

      this.logger.info(`Expired instant request ${requestId} status updated in DB`);
    }
  }
}
