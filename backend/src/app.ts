import express from "express";
import cors from "cors";
import helmet from "helmet";
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

const app = express();

app.use(helmet());
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

// Static Legacy Endpoint Mounts
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/location", locationRoutes);
app.use("/api/v1/providers", providerRoutes);
app.use("/api/v1/skills", skillRoutes);
app.use("/api/v1/instant-requests", instantRequestRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/pricing", pricingRoutes);

// Health Check
app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
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

// Fallback handlers
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
