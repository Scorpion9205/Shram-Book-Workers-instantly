import http from "http";
import dotenv from "dotenv"
dotenv.config();
import "./shared/config/redis.js" // Keep legacy redis config active

import app from "./app.js";
import { env } from "./config/env.js";
import { rabbitMQ } from "./shared/queue/connection/rabbitmq.connection.js";
import {
  initializeSocket,
} from "./socket/socket.js";

// New Infrastructure Imports
import { PrismaService } from "./database/prisma/PrismaService.js";
import { createRedisClient } from "./infrastructure/bootstrap/redis.bootstrap.js";
import { bootstrapRabbitMQ } from "./infrastructure/bootstrap/rabbitmq.bootstrap.js";
import { wireModules } from "./infrastructure/bootstrap/app.bootstrap.js";
import { Logger } from "./core/logger/Logger.js";

const logger = new Logger('ServerBoot');
const PORT = env.PORT;

const server =
  http.createServer(app);

initializeSocket(server);

// Boot legacy queue connection (still used by the /api/v1/ready probe)
await rabbitMQ.connect();

// Boot new infrastructure (Prisma, Redis, RabbitMQ)
try {
  logger.info('Starting new infrastructure initialization...');
  const prismaService = PrismaService.getInstance();
  await prismaService.connect();

  const newRedisClient = createRedisClient();
  const newRabbitConn = await bootstrapRabbitMQ();

  // Wire DI container
  const dependencies = await wireModules(prismaService, newRedisClient, newRabbitConn);

  // Expose dependencies via app.locals (Express's own per-app storage) instead of a
  // global — request handlers look this up per-request via `req.app.locals.deps`.
  app.locals.deps = dependencies;

  // Resume matching for any instant request still OPEN from before this restart — otherwise
  // its previous startMatching() loop is gone and nothing else ever resumes notifying workers
  // for it, silently breaking the "stays open until cancelled" guarantee across a deploy.
  dependencies.instantMatchingService.resumeAllOpenRequests().catch((err) => {
    logger.error('Failed to resume open instant requests after startup', err);
  });

  logger.info('New infrastructure initialized successfully');
} catch (err) {
  logger.error('Failed to initialize new infrastructure', err);
  process.exit(1);
}

server.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});


