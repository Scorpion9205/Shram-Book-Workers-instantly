import type { ChatThread, ChatMessage } from '@prisma/client';

export interface IChatRepository {
  findThreadByBookingId(bookingId: string): Promise<ChatThread | null>;
  createThread(bookingId: string): Promise<ChatThread>;
  findMessages(threadId: string, limit: number): Promise<ChatMessage[]>;
  createMessage(threadId: string, senderId: string, content: string): Promise<ChatMessage>;
}
