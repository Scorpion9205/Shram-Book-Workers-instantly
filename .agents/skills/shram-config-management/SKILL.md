---
name: shram-config-management
description: >-
  Use this skill when implementing configuration management in SHRAM: Zod env
  validation, bootstrap sequence, individual config classes (auth, redis,
  rabbitmq, razorpay, etc.), and the correct order to initialize services.
  Activate when: user asks about env setup, app startup, bootstrap order,
  config files, or adding a new environment variable.
---

# SHRAM — Config & Bootstrap System

## Environment Validation (config/env.ts)

All environment variables are validated at startup. If any required variable is missing, the app prints a clear error and exits immediately.

See rule `18-secrets-zod-validated.md` for the full Zod schema.

## Config Classes Pattern

Each external service has a typed config class:

```typescript
// config/auth.config.ts
import { env } from './env.js';

export const authConfig = {
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiry: env.JWT_ACCESS_EXPIRY,
    refreshExpiry: env.JWT_REFRESH_EXPIRY,
  },
  argon2: {
    type: 2, // argon2id
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  },
  otp: {
    expiryMinutes: 5,
    maxAttempts: 5,
    maxPerHour: 5,
  },
} as const;

// config/redis.config.ts
export const redisConfig = {
  url: env.REDIS_URL,
  retryStrategy: (times: number) => Math.min(times * 100, 3000),
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
} as const;

// config/rabbitmq.config.ts
export const rabbitmqConfig = {
  url: env.RABBITMQ_URL,
  heartbeat: 60,
  reconnectDelay: 5000,
} as const;

// config/razorpay.config.ts
export const razorpayConfig = {
  keyId: env.RAZORPAY_KEY_ID,
  keySecret: env.RAZORPAY_KEY_SECRET,
  webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
} as const;

// config/storage.config.ts — AWS S3
export const storageConfig = {
  region: env.AWS_REGION,
  bucket: env.AWS_S3_BUCKET,
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  urlExpiry: 3600, // signed URL valid for 1 hour
} as const;
```

## Bootstrap Sequence (bootstrap/app.bootstrap.ts)

Order matters — each step depends on the previous:

```typescript
// main.ts
async function main() {
  // 1. Validate env (fails fast)
  // env.ts runs at import time

  // 2. Connect infrastructure
  const prismaService = PrismaService.getInstance();
  await prismaService.connect();

  const redisClient = createRedisClient();
  const cacheService = new CacheService(redisClient);

  const rabbitMQConnection = await bootstrapRabbitMQ();

  // 3. Build providers
  const emailProvider = new ResendProvider(env.RESEND_API_KEY);
  const smsProvider = new ExotelProvider(...);
  const storageProvider = new S3Provider(storageConfig);
  const mapsProvider = new GoogleMapsProvider(env.GOOGLE_MAPS_API_KEY);
  const pushProvider = new FirebaseProvider(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT));
  const paymentProvider = new RazorpayProvider(razorpayConfig);

  // 4. Build event publisher
  const eventPublisher = new RabbitMQEventPublisher(rabbitMQConnection);
  await eventPublisher.init();

  // 5. Wire all modules (repositories → services → controllers)
  const deps = await wireModules({
    prismaService, cacheService, eventPublisher,
    emailProvider, smsProvider, storageProvider, mapsProvider, pushProvider, paymentProvider,
  });

  // 6. Build Express app
  const app = createApp(deps);

  // 7. Create HTTP server + Socket.IO
  const httpServer = createServer(app);
  await SocketServer.init(httpServer);

  // 8. Start RabbitMQ consumers
  await startConsumers(rabbitMQConnection, deps);

  // 9. Start cron jobs
  await bootstrapCronJobs(deps);

  // 10. Listen
  httpServer.listen(env.PORT, () => {
    Logger.info(`SHRAM API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  // 11. Graceful shutdown
  process.on('SIGTERM', async () => {
    Logger.info('SIGTERM received — shutting down gracefully');
    await prismaService.disconnect();
    redisClient.disconnect();
    await rabbitMQConnection.close();
    process.exit(0);
  });
}

main().catch((err) => {
  Logger.error('Startup failed', err);
  process.exit(1);
});
```

## Logger

```typescript
// core/logger/Logger.ts
export class Logger {
  constructor(private readonly context: string) {}

  info(message: string, meta?: object): void {
    console.log(JSON.stringify({ level: 'info', context: this.context, message, ...meta, timestamp: new Date().toISOString() }));
  }

  error(message: string, error?: unknown): void {
    console.error(JSON.stringify({ level: 'error', context: this.context, message, error: String(error), timestamp: new Date().toISOString() }));
  }

  warn(message: string, meta?: object): void {
    console.warn(JSON.stringify({ level: 'warn', context: this.context, message, ...meta, timestamp: new Date().toISOString() }));
  }

  debug(message: string, meta?: object): void {
    if (env.LOG_LEVEL === 'debug') {
      console.log(JSON.stringify({ level: 'debug', context: this.context, message, ...meta }));
    }
  }
}
```

## .env.example (must be kept in sync)

```env
# App
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/shram_dev

# JWT
JWT_ACCESS_SECRET=your-32-char-minimum-access-secret-here
JWT_REFRESH_SECRET=your-32-char-minimum-refresh-secret-here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=ap-south-1
AWS_S3_BUCKET=shram-uploads-dev

# Resend (Email)
RESEND_API_KEY=re_xxxx
EMAIL_FROM=noreply@shram.in

# Exotel (SMS)
EXOTEL_API_KEY=xxxx
EXOTEL_API_TOKEN=xxxx
EXOTEL_SID=xxxx
EXOTEL_FROM=SHRAM

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=xxxx
RAZORPAY_WEBHOOK_SECRET=xxxx

# Google
GOOGLE_MAPS_API_KEY=xxxx
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxx

# Firebase
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

# Logging
LOG_LEVEL=info
```
