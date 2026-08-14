import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const reqId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
  req.headers["x-request-id"] = reqId;
  res.setHeader("X-Request-ID", reqId);
  next();
};
