import type { SupportTicketStatus, SupportTicketPriority } from '@prisma/client';

export interface SupportTicketDto {
  id: string;
  userId: string;
  subject: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessageDto {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  isAdmin: boolean;
  content: string;
  createdAt: string;
}

export interface ISupportService {
  createTicket(
    userId: string,
    subject: string,
    message: string,
    priority?: SupportTicketPriority,
  ): Promise<SupportTicketDto>;
  getMyTickets(userId: string): Promise<SupportTicketDto[]>;
  getAllTickets(status?: SupportTicketStatus): Promise<SupportTicketDto[]>;
  getTicketMessages(requesterId: string, isAdmin: boolean, ticketId: string): Promise<SupportMessageDto[]>;
  addMessage(requesterId: string, isAdmin: boolean, ticketId: string, content: string): Promise<SupportMessageDto>;
  updateStatus(ticketId: string, status: SupportTicketStatus): Promise<SupportTicketDto>;
}
