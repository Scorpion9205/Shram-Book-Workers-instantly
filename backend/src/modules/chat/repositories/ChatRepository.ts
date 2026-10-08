import type { ChatThread, ChatMessage } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import type { IChatRepository } from '../interfaces/IChatRepository.js';

export class ChatRepository implements IChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findThreadByBookingId(bookingId: string): Promise<ChatThread | null> {
    return this.prisma.client.chatThread.findUnique({ where: { bookingId } });
  }

  async createThread(bookingId: string): Promise<ChatThread> {
    // Two concurrent first-messages on the same booking could both miss the findUnique
    // check above and both try to create a thread — bookingId is @unique on ChatThread, so
    // the loser's create() throws P2002. Treat that as "someone else already created it".
    try {
      return await this.prisma.client.chatThread.create({ data: { bookingId } });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        const existing = await this.findThreadByBookingId(bookingId);
        if (existing) return existing;
      }
      throw err;
    }
  }

  async findMessages(threadId: string, limit: number): Promise<ChatMessage[]> {
    const messages = await this.prisma.client.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return messages.reverse(); // chronological order for display
  }

  async createMessage(threadId: string, senderId: string, content: string): Promise<ChatMessage> {
    return this.prisma.client.chatMessage.create({
      data: { threadId, senderId, content },
    });
  }
}
