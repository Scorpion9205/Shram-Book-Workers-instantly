import { Router } from "express";
import type { ChatController } from "../controllers/ChatController.js";
import { authenticate } from "../../auth/middleware/authenticate.middleware.js";
import { rateLimiter } from "../../../shared/middleware/rateLimiter.middleware.js";

export function createChatRouter(controller: ChatController): Router {
  const router = Router();

  /**
   * @openapi
   * /chat/{bookingId}/messages:
   *   get:
   *     tags: [Chat]
   *     summary: Get the message history for a booking's chat thread
   *     parameters:
   *       - in: path
   *         name: bookingId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Messages retrieved, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessResponse' } } } }
   *       403: { description: Not a participant in this booking, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
   *       404: { description: Booking not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
   */
  router.get("/:bookingId/messages", authenticate, controller.getMessages);

  /**
   * @openapi
   * /chat/{bookingId}/send:
   *   post:
   *     tags: [Chat]
   *     summary: Send a message in a booking's chat thread (also broadcast over the /chat Socket.IO namespace)
   *     parameters:
   *       - in: path
   *         name: bookingId
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [content]
   *             properties:
   *               content: { type: string, maxLength: 2000 }
   *     responses:
   *       201: { description: Message sent, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessResponse' } } } }
   *       403: { description: Not a participant in this booking, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
   */
  router.post("/:bookingId/send", authenticate, rateLimiter("chat:send", 30, 60), controller.sendMessage);

  return router;
}
