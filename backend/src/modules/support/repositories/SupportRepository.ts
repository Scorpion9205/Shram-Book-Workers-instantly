import type { SupportTicket, SupportMessage, SupportTicketStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import type { ISupportRepository, CreateTicketData } from '../interfaces/ISupportRepository.js';

export class SupportRepository implements ISupportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(data: CreateTicketData): Promise<SupportTicket> {
    return this.prisma.client.supportTicket.create({
      data: {
        userId: data.userId,
        subject: data.subject,
        ...(data.priority && { priority: data.priority }),
        messages: { create: { senderId: data.userId, content: data.message } },
      },
    });
  }

  async findTicketById(id: string): Promise<SupportTicket | null> {
    return this.prisma.client.supportTicket.findUnique({ where: { id } });
  }

  async findTicketsByUser(userId: string): Promise<SupportTicket[]> {
    return this.prisma.client.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllTickets(status?: SupportTicketStatus): Promise<SupportTicket[]> {
    return this.prisma.client.supportTicket.findMany({
      ...(status && { where: { status } }),
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: SupportTicketStatus): Promise<SupportTicket> {
    return this.prisma.client.supportTicket.update({ where: { id }, data: { status } });
  }

  async createMessage(ticketId: string, senderId: string, content: string): Promise<SupportMessage> {
    return this.prisma.client.supportMessage.create({ data: { ticketId, senderId, content } });
  }

  async findMessages(ticketId: string): Promise<SupportMessage[]> {
    return this.prisma.client.supportMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
