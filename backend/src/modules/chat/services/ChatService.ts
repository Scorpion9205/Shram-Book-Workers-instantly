import type { IChatRepository } from '../interfaces/IChatRepository.js';
import type { IChatService, ChatMessageDto } from '../interfaces/IChatService.js';
import type { IBookingRepository } from '../../bookings/interfaces/IBookingRepository.js';
import type { IUserRepository } from '../../users/interfaces/IUserRepository.js';
import { NotFoundException, AuthorizationException } from '../../../core/exceptions/index.js';
import { getChatNamespace } from '../../../socket/socket.js';
import { Logger } from '../../../core/logger/Logger.js';

const MESSAGE_HISTORY_LIMIT = 100;

export class ChatService implements IChatService {
  private readonly logger = new Logger('ChatService');

  constructor(
    private readonly chatRepo: IChatRepository,
    private readonly bookingRepo: IBookingRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  /** Throws unless `userId` is the Provider or the assigned Worker on this booking. */
  private async authorize(userId: string, bookingId: string): Promise<{ providerId: string; workerUserId: string | null }> {
    const booking = await this.bookingRepo.findById(bookingId) as any;
    if (!booking) {
      throw new NotFoundException('Booking', bookingId);
    }

    const workerUserId: string | null = booking.worker?.userId ?? booking.worker?.user?.id ?? null;
    const isProvider = booking.providerId === userId;
    const isWorker = workerUserId !== null && workerUserId === userId;

    if (!isProvider && !isWorker) {
      throw new AuthorizationException('You are not a participant in this booking\'s chat');
    }

    return { providerId: booking.providerId, workerUserId };
  }

  private async enrichMessage(message: { id: string; threadId: string; senderId: string; content: string; createdAt: Date }): Promise<ChatMessageDto> {
    const sender = await this.userRepo.findById(message.senderId);
    return {
      id: message.id,
      threadId: message.threadId,
      senderId: message.senderId,
      senderName: sender?.name ?? 'Unknown',
      senderProfileImage: sender?.profileImage ?? null,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    };
  }

  async getMessages(userId: string, bookingId: string): Promise<ChatMessageDto[]> {
    await this.authorize(userId, bookingId);

    const thread = await this.chatRepo.findThreadByBookingId(bookingId);
    if (!thread) {
      return [];
    }

    const messages = await this.chatRepo.findMessages(thread.id, MESSAGE_HISTORY_LIMIT);
    return Promise.all(messages.map((m) => this.enrichMessage(m)));
  }

  async sendMessage(userId: string, bookingId: string, content: string): Promise<ChatMessageDto> {
    await this.authorize(userId, bookingId);

    let thread = await this.chatRepo.findThreadByBookingId(bookingId);
    if (!thread) {
      thread = await this.chatRepo.createThread(bookingId);
    }

    const message = await this.chatRepo.createMessage(thread.id, userId, content);
    const dto = await this.enrichMessage(message);

    try {
      getChatNamespace().to(`booking:${bookingId}`).emit('chat:message', dto);
    } catch (err) {
      // Socket.IO not initialized (e.g. in a test/worker process) — message is still
      // persisted; the recipient will see it on their next fetch instead of in real time.
      this.logger.debug('Skipped chat socket emit — socket not initialized', { bookingId });
    }

    return dto;
  }
}
