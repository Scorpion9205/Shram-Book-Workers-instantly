import { describe, it, expect, vi, beforeEach } from "vitest";
import { RabbitMQEventPublisher } from "../RabbitMQEventPublisher.js";

describe("RabbitMQEventPublisher — publish retry", () => {
  let channelMock: any;
  let connectionMock: any;
  let publisher: RabbitMQEventPublisher;

  beforeEach(async () => {
    channelMock = { publish: vi.fn(), on: vi.fn() };
    connectionMock = { createChannel: vi.fn().mockResolvedValue(channelMock) };

    publisher = new RabbitMQEventPublisher(connectionMock);
    await publisher.init();
  });

  it("succeeds immediately when the channel accepts the message on the first try", async () => {
    channelMock.publish.mockReturnValue(true);

    await publisher.publish("booking.status_changed", { bookingId: "booking_1" });

    expect(channelMock.publish).toHaveBeenCalledTimes(1);
  });

  it("retries after a transient failure and succeeds on a later attempt", async () => {
    channelMock.publish
      .mockImplementationOnce(() => {
        throw new Error("channel busy");
      })
      .mockReturnValueOnce(true);

    await publisher.publish("booking.status_changed", { bookingId: "booking_1" }, );

    expect(channelMock.publish).toHaveBeenCalledTimes(2);
  }, 10_000);

  it("gives up and throws after exhausting all retry attempts", async () => {
    channelMock.publish.mockImplementation(() => {
      throw new Error("broker unreachable");
    });

    await expect(publisher.publish("booking.status_changed", { bookingId: "booking_1" })).rejects.toThrow(
      "broker unreachable",
    );
    expect(channelMock.publish).toHaveBeenCalledTimes(3);
  }, 10_000);
});
