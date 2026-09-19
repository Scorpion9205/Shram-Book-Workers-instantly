import http from "http";
import dotenv from "dotenv";
dotenv.config();
import "./shared/config/redis.js"; // Keep legacy redis config active

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { startExpireInstantRequestsJob } from "./shared/jobs/expire-instant-requests.job.js";
import { rabbitMQ } from "./shared/queue/connection/rabbitmq.connection.js";
import { startEmailConsumer } from "./shared/email/consumers/email.consumer.js";
import { initializeSocket } from "./socket/socket.js";

// New Infrastructure Imports
import { PrismaService } from "./database/prisma/PrismaService.js";
import { createRedisClient } from "./infrastructure/bootstrap/redis.bootstrap.js";
import { bootstrapRabbitMQ } from "./infrastructure/bootstrap/rabbitmq.bootstrap.js";
import { wireModules } from "./infrastructure/bootstrap/app.bootstrap.js";
import { Logger } from "./core/logger/Logger.js";

const logger = new Logger('ServerBoot');
const PORT = env.PORT;

async function bootstrap() {
  try {
    logger.info('Starting infrastructure initialization...');
    const prismaService = PrismaService.getInstance();
    await prismaService.connect();

    const newRedisClient = createRedisClient();
    const newRabbitConn = await bootstrapRabbitMQ();

    // Boot legacy queue + email consumer
    await rabbitMQ.connect();
    await startEmailConsumer();

    // Wire DI container
    const dependencies = await wireModules(prismaService, newRedisClient, newRabbitConn);
    (global as any).deps = dependencies;

    // Create fully-wired Express app with typed routes
    const app = createApp(dependencies);
    const server = http.createServer(app);

    initializeSocket(server);

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      startExpireInstantRequestsJob();
    });
  } catch (err) {
    logger.error('Failed to initialize infrastructure', err);
    process.exit(1);
  }
}

bootstrap();
