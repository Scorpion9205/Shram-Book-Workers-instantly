import type { Request, Response } from "express";
import { BaseController } from "../../../core/base/BaseController.js";
import type { IChatService } from "../interfaces/IChatService.js";
import { sendMessageSchema } from "../validations/chat.validation.js";
import { BadRequestException } from "../../../core/exceptions/index.js";

export class ChatController extends BaseController {
  constructor(private readonly chatService: IChatService) {
    super();
  }

  getMessages = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const { bookingId } = req.params;
    if (!bookingId || typeof bookingId !== "string") {
      throw new BadRequestException("Invalid booking id");
    }
    const messages = await this.chatService.getMessages(user.userId, bookingId);
    this.ok(res, { messages }, "Chat messages retrieved successfully");
  };

  sendMessage = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const { bookingId } = req.params;
    if (!bookingId || typeof bookingId !== "string") {
      throw new BadRequestException("Invalid booking id");
    }
    const { content } = this.validate(sendMessageSchema, req.body);
    const message = await this.chatService.sendMessage(user.userId, bookingId, content);
    this.created(res, { message }, "Message sent successfully");
  };
}
