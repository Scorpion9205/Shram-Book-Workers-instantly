import { Router } from "express";
import type { SupportController } from "../controllers/SupportController.js";
import { authenticate } from "../../auth/middleware/authenticate.middleware.js";
import { authorize } from "../../auth/middleware/role.middleware.js";
import { rateLimiter } from "../../../shared/middleware/rateLimiter.middleware.js";
import { UserRole } from "../../../core/enums/Role.js";

export function createSupportRouter(controller: SupportController): Router {
  const router = Router();

  // Any authenticated user: create tickets, see their own, reply to their own.
  // Admins get every ticket (optionally filtered by ?status=) and can reply to any.
  router.post("/tickets", authenticate, rateLimiter("support:create", 10, 60), controller.createTicket);
  router.get("/tickets", authenticate, controller.getTickets);
  router.get("/tickets/:id/messages", authenticate, controller.getMessages);
  router.post("/tickets/:id/messages", authenticate, rateLimiter("support:message", 30, 60), controller.addMessage);

  // Admin-only
  router.put("/tickets/:id/status", authenticate, authorize(UserRole.ADMIN), controller.updateStatus);

  return router;
}
