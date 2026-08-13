# SHRAM Coding Rules — Zod-Validated Environment Variables

## Rule 18: All Env Vars Are Validated at Boot via Zod — App Fails Fast

No `process.env.SOME_VAR` scattered inline throughout the codebase. All environment variables are validated once at startup using a Zod schema and exposed as a typed config object.

### ✅ CORRECT — Centralized Env Config

```typescript
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  FRONTEND_URL: z.string().url(),

  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Redis
  REDIS_URL: z.string().url(),

  // RabbitMQ
  RABBITMQ_URL: z.string().url(),

  // AWS S3
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_REGION: z.string().min(1),
  AWS_S3_BUCKET: z.string().min(1),

  // Resend (Email)
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().email(),

  // Exotel (SMS)
  EXOTEL_API_KEY: z.string().min(1),
  EXOTEL_API_TOKEN: z.string().min(1),
  EXOTEL_SID: z.string().min(1),
  EXOTEL_FROM: z.string().min(1),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),

  // Google
  GOOGLE_MAPS_API_KEY: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  // Firebase
  FIREBASE_SERVICE_ACCOUNT: z.string().min(1), // JSON string

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1); // FAIL FAST
}

export const env = parsed.data;
```

### Using Config Throughout the App

```typescript
// ✅ Import typed env
import { env } from '../../config/env.js';

const token = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRY });
```

### ❌ WRONG — Inline process.env Access

```typescript
// ❌ Untyped, unvalidated env access
const secret = process.env.JWT_ACCESS_SECRET!;
const dbUrl = process.env.DATABASE_URL ?? 'postgresql://localhost/shram';

// ❌ process.env inside service/controller
export class AuthService {
  async refreshToken(token: string) {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!); // FORBIDDEN
  }
}
```

### .env.example Must Be Updated With Every New Variable

When adding a new env var to `envSchema`, immediately add it to `.env.example` with a placeholder value. Never commit real secrets.
