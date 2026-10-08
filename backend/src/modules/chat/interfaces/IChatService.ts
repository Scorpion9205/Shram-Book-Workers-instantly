export interface ChatMessageDto {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderProfileImage: string | null;
  content: string;
  createdAt: string;
}

export interface IChatService {
  getMessages(userId: string, bookingId: string): Promise<ChatMessageDto[]>;
  sendMessage(userId: string, bookingId: string, content: string): Promise<ChatMessageDto>;
}
