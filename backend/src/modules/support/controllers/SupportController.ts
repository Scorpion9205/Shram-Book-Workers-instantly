import type { Request, Response } from "express";
import type { SupportTicketStatus } from "@prisma/client";
import { BaseController } from "../../../core/base/BaseController.js";
import type { ISupportService } from "../interfaces/ISupportService.js";
import { createTicketSchema, addMessageSchema, updateTicketStatusSchema } from "../validations/support.validation.js";
import { BadRequestException } from "../../../core/exceptions/index.js";
import { UserRole } from "../../../core/enums/Role.js";

const TICKET_STATUSES: SupportTicketStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export class SupportController extends BaseController {
  constructor(private readonly supportService: ISupportService) {
    super();
  }

  private isAdmin(req: Request): boolean {
    const user = (req as any).user;
    return (user?.role || "").toUpperCase() === UserRole.ADMIN;
  }

  createTicket = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const { subject, message, priority } = this.validate(createTicketSchema, req.body);
    const ticket = await this.supportService.createTicket(user.userId, subject, message, priority);
    this.created(res, { ticket }, "Support ticket created successfully");
  };

  getTickets = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (this.isAdmin(req)) {
      const status = req.query.status;
      const parsedStatus = typeof status === "string" && TICKET_STATUSES.includes(status as SupportTicketStatus)
        ? (status as SupportTicketStatus)
        : undefined;
      const tickets = await this.supportService.getAllTickets(parsedStatus);
      this.ok(res, { tickets }, "Support tickets retrieved successfully");
      return;
    }

    const tickets = await this.supportService.getMyTickets(user.userId);
    this.ok(res, { tickets }, "Support tickets retrieved successfully");
  };

  getMessages = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const ticketId = req.params.id as string;
    if (!ticketId) throw new BadRequestException("Invalid ticket id");

    const messages = await this.supportService.getTicketMessages(user.userId, this.isAdmin(req), ticketId);
    this.ok(res, { messages }, "Ticket messages retrieved successfully");
  };

  addMessage = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const ticketId = req.params.id as string;
    if (!ticketId) throw new BadRequestException("Invalid ticket id");

    const { content } = this.validate(addMessageSchema, req.body);
    const message = await this.supportService.addMessage(user.userId, this.isAdmin(req), ticketId, content);
    this.created(res, { message }, "Message sent successfully");
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    const ticketId = req.params.id as string;
    if (!ticketId) throw new BadRequestException("Invalid ticket id");

    const { status } = this.validate(updateTicketStatusSchema, req.body);
    const ticket = await this.supportService.updateStatus(ticketId, status);
    this.ok(res, { ticket }, "Ticket status updated successfully");
  };
}
