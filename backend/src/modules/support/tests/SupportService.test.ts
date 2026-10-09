import { describe, it, expect, vi, beforeEach } from "vitest";
import { SupportService } from "../services/SupportService.js";
import { NotFoundException, AuthorizationException, BusinessException } from "../../../core/exceptions/index.js";

describe("SupportService", () => {
  let supportRepoMock: any;
  let userRepoMock: any;
  let service: SupportService;

  const ticket = {
    id: "ticket_1",
    userId: "user_1",
    subject: "Payment not received",
    status: "OPEN" as const,
    priority: "MEDIUM" as const,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };

  beforeEach(() => {
    supportRepoMock = {
      createTicket: vi.fn(),
      findTicketById: vi.fn(),
      findTicketsByUser: vi.fn(),
      findAllTickets: vi.fn(),
      updateStatus: vi.fn(),
      createMessage: vi.fn(),
      findMessages: vi.fn(),
    };
    userRepoMock = { findById: vi.fn() };

    service = new SupportService(supportRepoMock, userRepoMock);
  });

  describe("createTicket", () => {
    it("delegates to the repository and maps the DTO", async () => {
      supportRepoMock.createTicket.mockResolvedValue(ticket);

      const result = await service.createTicket("user_1", "Payment not received", "My payment is stuck");

      expect(supportRepoMock.createTicket).toHaveBeenCalledWith({
        userId: "user_1",
        subject: "Payment not received",
        message: "My payment is stuck",
      });
      expect(result.id).toBe("ticket_1");
    });
  });

  describe("access control", () => {
    it("throws NotFoundException for a nonexistent ticket", async () => {
      supportRepoMock.findTicketById.mockResolvedValue(null);
      await expect(service.getTicketMessages("user_1", false, "missing")).rejects.toThrow(NotFoundException);
    });

    it("throws AuthorizationException for a non-owner, non-admin requester", async () => {
      supportRepoMock.findTicketById.mockResolvedValue(ticket);
      await expect(service.getTicketMessages("someone_else", false, "ticket_1")).rejects.toThrow(AuthorizationException);
    });

    it("allows the ticket owner", async () => {
      supportRepoMock.findTicketById.mockResolvedValue(ticket);
      supportRepoMock.findMessages.mockResolvedValue([]);
      await expect(service.getTicketMessages("user_1", false, "ticket_1")).resolves.toEqual([]);
    });

    it("allows an admin regardless of ownership", async () => {
      supportRepoMock.findTicketById.mockResolvedValue(ticket);
      supportRepoMock.findMessages.mockResolvedValue([]);
      await expect(service.getTicketMessages("admin_1", true, "ticket_1")).resolves.toEqual([]);
    });
  });

  describe("addMessage", () => {
    it("rejects messages on a closed ticket", async () => {
      supportRepoMock.findTicketById.mockResolvedValue({ ...ticket, status: "CLOSED" });
      await expect(service.addMessage("user_1", false, "ticket_1", "hello")).rejects.toThrow(BusinessException);
      expect(supportRepoMock.createMessage).not.toHaveBeenCalled();
    });

    it("auto-transitions OPEN to IN_PROGRESS on an admin's reply", async () => {
      supportRepoMock.findTicketById.mockResolvedValue(ticket);
      supportRepoMock.createMessage.mockResolvedValue({
        id: "msg_1",
        ticketId: "ticket_1",
        senderId: "admin_1",
        content: "We're looking into it",
        createdAt: new Date(),
      });
      userRepoMock.findById.mockResolvedValue({ name: "Support Admin", role: "ADMIN" });

      const result = await service.addMessage("admin_1", true, "ticket_1", "We're looking into it");

      expect(supportRepoMock.updateStatus).toHaveBeenCalledWith("ticket_1", "IN_PROGRESS");
      expect(result.isAdmin).toBe(true);
    });

    it("does not touch status when the owner replies", async () => {
      supportRepoMock.findTicketById.mockResolvedValue(ticket);
      supportRepoMock.createMessage.mockResolvedValue({
        id: "msg_2",
        ticketId: "ticket_1",
        senderId: "user_1",
        content: "Any update?",
        createdAt: new Date(),
      });
      userRepoMock.findById.mockResolvedValue({ name: "Test User", role: "WORKER" });

      await service.addMessage("user_1", false, "ticket_1", "Any update?");

      expect(supportRepoMock.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe("updateStatus", () => {
    it("throws NotFoundException for a nonexistent ticket", async () => {
      supportRepoMock.findTicketById.mockResolvedValue(null);
      await expect(service.updateStatus("missing", "RESOLVED")).rejects.toThrow(NotFoundException);
      expect(supportRepoMock.updateStatus).not.toHaveBeenCalled();
    });

    it("updates the status via the repository", async () => {
      supportRepoMock.findTicketById.mockResolvedValue(ticket);
      supportRepoMock.updateStatus.mockResolvedValue({ ...ticket, status: "RESOLVED" });

      const result = await service.updateStatus("ticket_1", "RESOLVED");

      expect(supportRepoMock.updateStatus).toHaveBeenCalledWith("ticket_1", "RESOLVED");
      expect(result.status).toBe("RESOLVED");
    });
  });
});
