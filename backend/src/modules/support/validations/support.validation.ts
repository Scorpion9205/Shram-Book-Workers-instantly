import { z } from "zod";

export const createTicketSchema = z.object({
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(200, "Subject is too long"),
  message: z.string().trim().min(1, "Message cannot be empty").max(5000, "Message is too long"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});

export const addMessageSchema = z.object({
  content: z.string().trim().min(1, "Message cannot be empty").max(5000, "Message is too long"),
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});
