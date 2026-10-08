import { Router } from "express";
import type { ChatController } from "../controllers/ChatController.js";
import { authenticate } from "../../auth/middleware/authenticate.middleware.js";
import { rateLimiter } from "../../../shared/middleware/rateLimiter.middleware.js";

export function createChatRouter(controller: ChatController): Router {
  const router = Router();

  router.get("/:bookingId/messages", authenticate, controller.getMessages);
  router.post("/:bookingId/send", authenticate, rateLimiter("chat:send", 30, 60), controller.sendMessage);

  return router;
}
