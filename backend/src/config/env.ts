import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  // Extra site addresses allowed to call the API and open websockets, comma separated
  // (e.g. the same site without "www"). FRONTEND_URL itself is always allowed.
  EXTRA_CORS_ORIGINS: z.string().optional(),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // RabbitMQ
  RABBITMQ_URL: z.string().default('amqp://localhost:5672'),

  // AWS S3
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('ap-south-1'),
  AWS_S3_BUCKET: z.string().optional(),

  // Resend (Email)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@shram.in'),

  // Exotel (SMS)
  EXOTEL_API_KEY: z.string().optional(),
  EXOTEL_API_TOKEN: z.string().optional(),
  EXOTEL_SID: z.string().optional(),
  EXOTEL_FROM: z.string().default('SHRAM'),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // Mapbox (server-side routing/ETA — Directions API)
  MAPBOX_ACCESS_TOKEN: z.string().optional(),

  // Google
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Firebase
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  // Temporary reviewer login (e.g. for a payment-gateway review). When BOTH are set, this one
  // email can log in as a Provider with the fixed OTP below, and no real OTP is sent.
  // Leave them unset (or blank) to disable. Remove them again once the review is done.
  // Blank values are treated as "not set" so an empty Render field can't break startup.
  REVIEW_TEST_EMAIL: z.preprocess((v) => (v === '' ? undefined : v), z.string().email().optional()),
  REVIEW_TEST_OTP: z.preprocess((v) => (v === '' ? undefined : v), z.string().min(6).optional()),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables — fix these before starting the app:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;

// Every origin the browser is allowed to talk to us from: the main frontend plus any extras.
export const allowedOrigins: string[] = [
  env.FRONTEND_URL,
  ...(env.EXTRA_CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean),
];
export type Env = typeof env;
