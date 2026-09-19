import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";

// Static Legacy Routes
import authRoutes from "./modules/auth/routes/auth.routes.js";
import locationRoutes from "./modules/location/routes/location.routes.js";
import providerRoutes from "./modules/providers/routes/provider.routes.js";
import skillRoutes from "./modules/skills/routes/skill.routes.js";
import instantRequestRoutes from "./modules/instant-requests/routes/instant-request.routes.js";
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
import type { AppDependencies } from "./infrastructure/bootstrap/app.bootstrap.js";

export function createApp(deps?: AppDependencies) {
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
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Idempotent client requests caching
  app.use(idempotencyMiddleware());

  // Health Check with Database and Redis Ping
  app.get("/api/v1/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
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

  // Static Endpoint Mounts
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/location", locationRoutes);
  app.use("/api/v1/providers", providerRoutes);
  app.use("/api/v1/skills", skillRoutes);
  app.use("/api/v1/instant-requests", instantRequestRoutes);
  app.use("/api/v1/dashboard", dashboardRoutes);
  app.use("/api/v1/pricing", pricingRoutes);

  // Dependency Injection Endpoint Mounts
  if (deps) {
    app.use("/api/v1/users", deps.userRouter);
    app.use("/api/v1/workers", deps.workerRouter);
    app.use("/api/v1/agents", deps.agentRouter);
    app.use("/api/v1/reviews", deps.reviewRouter);
    app.use("/api/v1/jobs", deps.jobRouter);
    app.use("/api/v1/payments", deps.paymentRouter);
    app.use("/api/v1/wallet", deps.walletRouter);
    app.use("/api/v1/admin", deps.adminRouter);
    app.use("/api/v1/notifications", deps.notificationRouter);
    app.use("/api/v1/bookings", deps.bookingRouter);
  } else {
    // Dynamic fallback when app is instantiated before DI bootstrap (e.g. testing)
    app.use("/api/v1/users", (req, res, next) => (global as any).deps?.userRouter(req, res, next));
    app.use("/api/v1/workers", (req, res, next) => (global as any).deps?.workerRouter(req, res, next));
    app.use("/api/v1/agents", (req, res, next) => (global as any).deps?.agentRouter(req, res, next));
    app.use("/api/v1/reviews", (req, res, next) => (global as any).deps?.reviewRouter(req, res, next));
    app.use("/api/v1/jobs", (req, res, next) => (global as any).deps?.jobRouter(req, res, next));
    app.use("/api/v1/payments", (req, res, next) => (global as any).deps?.paymentRouter(req, res, next));
    app.use("/api/v1/wallet", (req, res, next) => (global as any).deps?.walletRouter(req, res, next));
    app.use("/api/v1/admin", (req, res, next) => (global as any).deps?.adminRouter(req, res, next));
    app.use("/api/v1/notifications", (req, res, next) => (global as any).deps?.notificationRouter(req, res, next));
    app.use("/api/v1/bookings", (req, res, next) => (global as any).deps?.bookingRouter(req, res, next));
  }

  // Fallback handlers
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
}

const defaultApp = createApp();
export default defaultApp;
