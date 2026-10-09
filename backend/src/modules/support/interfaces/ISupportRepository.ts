import type { SupportTicket, SupportMessage, SupportTicketStatus, SupportTicketPriority } from '@prisma/client';

export interface CreateTicketData {
  userId: string;
  subject: string;
  message: string;
  priority?: SupportTicketPriority;
}

export interface ISupportRepository {
  createTicket(data: CreateTicketData): Promise<SupportTicket>;
  findTicketById(id: string): Promise<SupportTicket | null>;
  findTicketsByUser(userId: string): Promise<SupportTicket[]>;
  findAllTickets(status?: SupportTicketStatus): Promise<SupportTicket[]>;
  updateStatus(id: string, status: SupportTicketStatus): Promise<SupportTicket>;
  createMessage(ticketId: string, senderId: string, content: string): Promise<SupportMessage>;
  findMessages(ticketId: string): Promise<SupportMessage[]>;
}
