import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChatService } from "../services/ChatService.js";
import { AuthorizationException, NotFoundException } from "../../../core/exceptions/index.js";

const emitMock = vi.fn();
const toMock = vi.fn(() => ({ emit: emitMock }));
vi.mock("../../../socket/socket.js", () => ({
  getChatNamespace: () => ({ to: toMock }),
}));

describe("ChatService", () => {
  let chatRepoMock: any;
  let bookingRepoMock: any;
  let userRepoMock: any;
  let service: ChatService;

  const booking = {
    id: "booking_1",
    providerId: "provider_1",
    worker: { userId: "worker_user_1", user: { id: "worker_user_1" } },
  };

  beforeEach(() => {
    emitMock.mockClear();
    toMock.mockClear();

    chatRepoMock = {
      findThreadByBookingId: vi.fn(),
      createThread: vi.fn(),
      findMessages: vi.fn(),
      createMessage: vi.fn(),
    };
    bookingRepoMock = { findById: vi.fn() };
    userRepoMock = { findById: vi.fn() };

    service = new ChatService(chatRepoMock, bookingRepoMock, userRepoMock);
  });

  describe("authorization", () => {
    it("throws NotFoundException for a nonexistent booking", async () => {
      bookingRepoMock.findById.mockResolvedValue(null);
      await expect(service.getMessages("provider_1", "booking_1")).rejects.toThrow(NotFoundException);
    });

    it("throws AuthorizationException for someone who is neither the Provider nor the assigned Worker", async () => {
      bookingRepoMock.findById.mockResolvedValue(booking);
      await expect(service.getMessages("some_other_user", "booking_1")).rejects.toThrow(AuthorizationException);
    });

    it("allows the Provider", async () => {
      bookingRepoMock.findById.mockResolvedValue(booking);
      chatRepoMock.findThreadByBookingId.mockResolvedValue(null);
      await expect(service.getMessages("provider_1", "booking_1")).resolves.toEqual([]);
    });

    it("allows the assigned Worker", async () => {
      bookingRepoMock.findById.mockResolvedValue(booking);
      chatRepoMock.findThreadByBookingId.mockResolvedValue(null);
      await expect(service.getMessages("worker_user_1", "booking_1")).resolves.toEqual([]);
    });
  });

  describe("sendMessage", () => {
    it("creates the thread on first message, persists the message, and broadcasts to the booking's chat room", async () => {
      bookingRepoMock.findById.mockResolvedValue(booking);
      chatRepoMock.findThreadByBookingId.mockResolvedValue(null);
      chatRepoMock.createThread.mockResolvedValue({ id: "thread_1", bookingId: "booking_1" });
      chatRepoMock.createMessage.mockResolvedValue({
        id: "msg_1",
        threadId: "thread_1",
        senderId: "provider_1",
        content: "Hello",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      });
      userRepoMock.findById.mockResolvedValue({ name: "Test Provider", profileImage: null });

      const result = await service.sendMessage("provider_1", "booking_1", "Hello");

      expect(chatRepoMock.createThread).toHaveBeenCalledWith("booking_1");
      expect(chatRepoMock.createMessage).toHaveBeenCalledWith("thread_1", "provider_1", "Hello");
      expect(result.senderName).toBe("Test Provider");
      expect(toMock).toHaveBeenCalledWith("booking:booking_1");
      expect(emitMock).toHaveBeenCalledWith("chat:message", expect.objectContaining({ id: "msg_1", content: "Hello" }));
    });

    it("reuses an existing thread instead of creating a duplicate", async () => {
      bookingRepoMock.findById.mockResolvedValue(booking);
      chatRepoMock.findThreadByBookingId.mockResolvedValue({ id: "thread_existing", bookingId: "booking_1" });
      chatRepoMock.createMessage.mockResolvedValue({
        id: "msg_2",
        threadId: "thread_existing",
        senderId: "worker_user_1",
        content: "On my way",
        createdAt: new Date(),
      });
      userRepoMock.findById.mockResolvedValue({ name: "Test Worker", profileImage: null });

      await service.sendMessage("worker_user_1", "booking_1", "On my way");

      expect(chatRepoMock.createThread).not.toHaveBeenCalled();
      expect(chatRepoMock.createMessage).toHaveBeenCalledWith("thread_existing", "worker_user_1", "On my way");
    });

    it("rejects a non-participant from sending a message", async () => {
      bookingRepoMock.findById.mockResolvedValue(booking);
      await expect(service.sendMessage("random_user", "booking_1", "hi")).rejects.toThrow(AuthorizationException);
      expect(chatRepoMock.createMessage).not.toHaveBeenCalled();
    });
  });
});
