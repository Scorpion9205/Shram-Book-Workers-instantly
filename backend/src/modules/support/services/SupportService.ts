import type { SupportTicket, SupportMessage, SupportTicketStatus, SupportTicketPriority } from '@prisma/client';
import type { ISupportRepository } from '../interfaces/ISupportRepository.js';
import type { ISupportService, SupportTicketDto, SupportMessageDto } from '../interfaces/ISupportService.js';
import type { IUserRepository } from '../../users/interfaces/IUserRepository.js';
import { NotFoundException, AuthorizationException, BusinessException } from '../../../core/exceptions/index.js';
import { UserRole } from '../../../core/enums/Role.js';

export class SupportService implements ISupportService {
  constructor(
    private readonly supportRepo: ISupportRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  private toTicketDto(ticket: SupportTicket): SupportTicketDto {
    return {
      id: ticket.id,
      userId: ticket.userId,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    };
  }

  private async toMessageDto(message: SupportMessage): Promise<SupportMessageDto> {
    const sender = await this.userRepo.findById(message.senderId);
    return {
      id: message.id,
      ticketId: message.ticketId,
      senderId: message.senderId,
      senderName: sender?.name ?? 'Unknown',
      isAdmin: sender?.role === UserRole.ADMIN,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    };
  }

  private async getTicketOrThrow(ticketId: string): Promise<SupportTicket> {
    const ticket = await this.supportRepo.findTicketById(ticketId);
    if (!ticket) {
      throw new NotFoundException('SupportTicket', ticketId);
    }
    return ticket;
  }

  private assertCanAccess(ticket: SupportTicket, requesterId: string, isAdmin: boolean): void {
    if (!isAdmin && ticket.userId !== requesterId) {
      throw new AuthorizationException('You do not have access to this support ticket');
    }
  }

  async createTicket(
    userId: string,
    subject: string,
    message: string,
    priority?: SupportTicketPriority,
  ): Promise<SupportTicketDto> {
    const ticket = await this.supportRepo.createTicket({ userId, subject, message, ...(priority && { priority }) });
    return this.toTicketDto(ticket);
  }

  async getMyTickets(userId: string): Promise<SupportTicketDto[]> {
    const tickets = await this.supportRepo.findTicketsByUser(userId);
    return tickets.map((t) => this.toTicketDto(t));
  }

  async getAllTickets(status?: SupportTicketStatus): Promise<SupportTicketDto[]> {
    const tickets = await this.supportRepo.findAllTickets(status);
    return tickets.map((t) => this.toTicketDto(t));
  }

  async getTicketMessages(requesterId: string, isAdmin: boolean, ticketId: string): Promise<SupportMessageDto[]> {
    const ticket = await this.getTicketOrThrow(ticketId);
    this.assertCanAccess(ticket, requesterId, isAdmin);

    const messages = await this.supportRepo.findMessages(ticketId);
    return Promise.all(messages.map((m) => this.toMessageDto(m)));
  }

  async addMessage(requesterId: string, isAdmin: boolean, ticketId: string, content: string): Promise<SupportMessageDto> {
    const ticket = await this.getTicketOrThrow(ticketId);
    this.assertCanAccess(ticket, requesterId, isAdmin);

    if (ticket.status === 'CLOSED') {
      throw new BusinessException('TICKET_CLOSED', 'This ticket is closed and no longer accepting messages');
    }

    // An admin's first reply moves a freshly-opened ticket into progress automatically.
    if (isAdmin && ticket.status === 'OPEN') {
      await this.supportRepo.updateStatus(ticketId, 'IN_PROGRESS');
    }

    const message = await this.supportRepo.createMessage(ticketId, requesterId, content);
    return this.toMessageDto(message);
  }

  async updateStatus(ticketId: string, status: SupportTicketStatus): Promise<SupportTicketDto> {
    await this.getTicketOrThrow(ticketId);
    const updated = await this.supportRepo.updateStatus(ticketId, status);
    return this.toTicketDto(updated);
  }
}
