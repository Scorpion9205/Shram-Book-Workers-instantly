import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentRepository } from "../repositories/AgentRepository.js";

describe("AgentRepository.findCommissionableBookings", () => {
  let prismaServiceMock: any;
  let repo: AgentRepository;

  beforeEach(() => {
    prismaServiceMock = {
      client: { booking: { findMany: vi.fn().mockResolvedValue([]) } },
    };
    repo = new AgentRepository(prismaServiceMock);
  });

  it("filters on the booking's own settled status, not a Payment relation — OFFLINE bookings never get a Payment row at all", async () => {
    await repo.findCommissionableBookings("agent_1");

    expect(prismaServiceMock.client.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          agentId: "agent_1",
          status: { in: ["PAYMENT_SETTLED", "REVIEWED", "CLOSED"] },
        },
      }),
    );
  });
});
