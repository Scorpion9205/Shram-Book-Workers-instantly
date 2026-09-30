import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";

// Static Legacy Routes
import authRoutes from "./modules/auth/routes/auth.routes.js";
import locationRoutes from "./modules/location/routes/location.routes.js";
import providerRoutes from "./modules/providers/routes/provider.routes.js";
import skillRoutes from "./modules/skills/routes/skill.routes.js";
import dashboardRoutes from "./modules/dashboard/routes/dashboard.routes.js";
import pricingRoutes from "./modules/pricing/routes/pricing.routes.js";

// Middlewares
import { notFoundHandler } from "./middleware/notFound.middleware.js";
import { globalErrorHandler } from "./middleware/error.middleware.js";
import { requestIdMiddleware } from "./shared/middleware/requestId.middleware.js";
import { helmetMiddleware } from "./shared/middleware/helmet.middleware.js";
import { idempotencyMiddleware } from "./shared/middleware/idempotency.middleware.js";

// Databases configuration
import prisma from "./shared/config/prisma.js";
import { redis } from "./shared/config/redis.js";
import { rabbitMQ } from "./shared/queue/connection/rabbitmq.connection.js";

const app = express();

// Traceable unique request identifier
app.use(requestIdMiddleware);

// Security hardening headers
app.use(helmetMiddleware);

// CORS cross origin restrictor
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  })
);

app.use(morgan("dev"));
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Idempotent client requests caching
app.use(idempotencyMiddleware());

// Static Legacy Endpoint Mounts
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/location", locationRoutes);
app.use("/api/v1/providers", providerRoutes);
app.use("/api/v1/skills", skillRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/pricing", pricingRoutes);

// Health Check with Database and Redis Ping
app.get("/api/v1/health", async (_req, res) => {
  try {
    // Ping Database (Prisma PostgreSQL)
    await prisma.$queryRaw`SELECT 1`;

    // Ping Redis
    await redis.ping();

    res.status(200).json({
      success: true,
      status: "UP",
      database: "CONNECTED",
      redis: "CONNECTED",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      status: "DOWN",
      error: error.message || String(error),
    });
  }
});

// Liveness Probe — process is up, no dependency checks
app.get("/api/v1/live", (_req, res) => {
  res.status(200).json({
    success: true,
    status: "ALIVE",
  });
});

// Readiness Probe — dependencies must be reachable before traffic is routed
app.get("/api/v1/ready", async (_req, res) => {
  const checks: Record<string, "CONNECTED" | "DOWN"> = {
    database: "DOWN",
    redis: "DOWN",
    rabbitmq: "DOWN",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "CONNECTED";
  } catch {
    // left as DOWN
  }

  try {
    await redis.ping();
    checks.redis = "CONNECTED";
  } catch {
    // left as DOWN
  }

  try {
    rabbitMQ.getChannel();
    checks.rabbitmq = "CONNECTED";
  } catch {
    // left as DOWN
  }

  const isReady = Object.values(checks).every((status) => status === "CONNECTED");

  res.status(isReady ? 200 : 503).json({
    success: isReady,
    status: isReady ? "READY" : "NOT_READY",
    ...checks,
  });
});

// Dynamic Dependency Injection Endpoint Mounts
app.use("/api/v1/users", (req, res, next) => {
  (global as any).deps.userRouter(req, res, next);
});

app.use("/api/v1/workers", (req, res, next) => {
  (global as any).deps.workerRouter(req, res, next);
});

app.use("/api/v1/agents", (req, res, next) => {
  (global as any).deps.agentRouter(req, res, next);
});

app.use("/api/v1/reviews", (req, res, next) => {
  (global as any).deps.reviewRouter(req, res, next);
});

app.use("/api/v1/jobs", (req, res, next) => {
  (global as any).deps.jobRouter(req, res, next);
});

app.use("/api/v1/payments", (req, res, next) => {
  (global as any).deps.paymentRouter(req, res, next);
});

app.use("/api/v1/wallet", (req, res, next) => {
  (global as any).deps.walletRouter(req, res, next);
});

app.use("/api/v1/admin", (req, res, next) => {
  (global as any).deps.adminRouter(req, res, next);
});

app.use("/api/v1/notifications", (req, res, next) => {
  (global as any).deps.notificationRouter(req, res, next);
});

app.use("/api/v1/bookings", (req, res, next) => {
  (global as any).deps.bookingRouter(req, res, next);
});

app.use("/api/v1/instant-requests", (req, res, next) => {
  (global as any).deps.instantRequestRouter(req, res, next);
});

// Fallback handlers
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
