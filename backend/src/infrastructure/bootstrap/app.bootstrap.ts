import * as amqp from 'amqplib';
import { PrismaService } from '../../database/prisma/PrismaService.js';
import type { ICacheService } from '../../core/interfaces/ICacheService.js';
import type { IEventPublisher } from '../../core/interfaces/IEventPublisher.js';
import { CacheService } from '../cache/CacheService.js';
import { RabbitMQEventPublisher } from '../queue/RabbitMQEventPublisher.js';
import { Logger } from '../../core/logger/Logger.js';

const logger = new Logger('AppBootstrap');

export interface AppDependencies {
  prisma: PrismaService;
  cache: ICacheService;
  eventPublisher: IEventPublisher;
  rabbitConn: amqp.Connection;
}

/**
 * Initializes and wires all application dependencies (manual Dependency Injection).
 * Acts as the single source of truth for object instantiation.
 */
export async function wireModules(
  prismaService: PrismaService,
  redisClient: any,
  rabbitConnection: amqp.Connection,
): Promise<AppDependencies> {
  logger.info('Wiring application modules and dependencies...');

  // 1. Core Infrastructure Classes
  const cacheService = new CacheService(redisClient);
  const eventPublisher = new RabbitMQEventPublisher(rabbitConnection);

  // Initialize event publisher
  await eventPublisher.init();

  // 2. Repositories (will be registered here in later phases)

  // 3. Services (will be registered here in later phases)

  // 4. Controllers (will be registered here in later phases)

  logger.info('Module wiring completed successfully');

  return {
    prisma: prismaService,
    cache: cacheService,
    eventPublisher,
    rabbitConn: rabbitConnection,
  };
}
