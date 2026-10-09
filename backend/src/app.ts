import express from "express";
import type { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";

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

import type { AppDependencies } from "./infrastructure/bootstrap/app.bootstrap.js";
import { mountSwagger } from "./infrastructure/bootstrap/swagger.bootstrap.js";

declare module "express-serve-static-core" {
  interface Locals {
    deps?: AppDependencies;
  }
}

const app = express();

mountSwagger(app);

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

/**
 * Mounts a DI-wired router that only becomes available once `wireModules()` resolves
 * in server.ts (app.locals.deps is set there, after the app is already listening).
 * Looks up the router lazily on each request — via `app.locals`, not a global — and
 * responds with a clean 503 instead of crashing if a request somehow arrives before
 * bootstrap finished, rather than throwing "Cannot read properties of undefined".
 */
function mountDI(app: Express, basePath: string, getRouter: (deps: AppDependencies) => express.Router): void {
  app.use(basePath, (req: Request, res: Response, next: NextFunction) => {
    const deps = req.app.locals.deps;
    if (!deps) {
      res.status(503).json({
        success: false,
        message: "Service is still starting up. Please retry shortly.",
      });
      return;
    }
    getRouter(deps)(req, res, next);
  });
}

// Dependency Injection Endpoint Mounts
mountDI(app, "/api/v1/auth", (deps) => deps.authRouter);
mountDI(app, "/api/v1/location", (deps) => deps.locationRouter);
mountDI(app, "/api/v1/providers", (deps) => deps.providerRouter);
mountDI(app, "/api/v1/skills", (deps) => deps.skillRouter);
mountDI(app, "/api/v1/categories", (deps) => deps.categoryRouter);
mountDI(app, "/api/v1/dashboard", (deps) => deps.dashboardRouter);
mountDI(app, "/api/v1/pricing", (deps) => deps.pricingRouter);
mountDI(app, "/api/v1/users", (deps) => deps.userRouter);
mountDI(app, "/api/v1/workers", (deps) => deps.workerRouter);
mountDI(app, "/api/v1/agents", (deps) => deps.agentRouter);
mountDI(app, "/api/v1/reviews", (deps) => deps.reviewRouter);
mountDI(app, "/api/v1/jobs", (deps) => deps.jobRouter);
mountDI(app, "/api/v1/payments", (deps) => deps.paymentRouter);
mountDI(app, "/api/v1/wallet", (deps) => deps.walletRouter);
mountDI(app, "/api/v1/admin", (deps) => deps.adminRouter);
mountDI(app, "/api/v1/notifications", (deps) => deps.notificationRouter);
mountDI(app, "/api/v1/bookings", (deps) => deps.bookingRouter);
mountDI(app, "/api/v1/instant-requests", (deps) => deps.instantRequestRouter);
mountDI(app, "/api/v1/chat", (deps) => deps.chatRouter);

// Fallback handlers
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
