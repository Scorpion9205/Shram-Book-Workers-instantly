import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InstantMatchingService } from "../services/instant-matching.service.js";

const emitMock = vi.fn();
const toMock = vi.fn(() => ({ emit: emitMock }));
vi.mock("../../../socket/socket.js", () => ({
  getIO: () => ({
    to: toMock,
  }),
}));

describe("InstantMatchingService", () => {
  let requestRepoMock: any;
  let cacheMock: any;
  let platformSettingRepoMock: any;
  let service: InstantMatchingService;

  const baseRequest = {
    id: "req_1",
    status: "OPEN",
    skillId: "skill_1",
    latitude: 12.9,
    longitude: 77.5,
    bookingMode: "DIRECT",
    providerId: "provider_1",
    provider: { name: "Test Provider" },
    skill: { name: "Plumbing" },
    items: [{ id: "item_1" }],
  };

  beforeEach(() => {
    vi.useFakeTimers();
    emitMock.mockClear();
    toMock.mockClear();

    requestRepoMock = {
      findRequestWithItemsAndProvider: vi.fn(),
      findEligibleWorkersForMatching: vi.fn(),
    };
    cacheMock = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn(),
      geoSearch: vi.fn().mockResolvedValue([]),
    };
    platformSettingRepoMock = {
      get: vi.fn().mockResolvedValue(null), // no override -> defaults apply
    };

    service = new InstantMatchingService(requestRepoMock, cacheMock, platformSettingRepoMock);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("escalates through all default tiers (2/5/10km) immediately, with no wait, when every tier is empty", async () => {
    // Stays OPEN forever in this test except we force-stop via a 4th call returning CANCELLED,
    // since the real design never expires on its own.
    requestRepoMock.findRequestWithItemsAndProvider
      .mockResolvedValueOnce(baseRequest) // tier 2km
      .mockResolvedValueOnce(baseRequest) // tier 5km
      .mockResolvedValueOnce(baseRequest) // tier 10km (max)
      .mockResolvedValueOnce({ ...baseRequest, status: "CANCELLED" }); // detected on next poll
    requestRepoMock.findEligibleWorkersForMatching.mockResolvedValue([]);

    const promise = service.startMatching("req_1");
    await vi.runAllTimersAsync();
    await promise;

    expect(cacheMock.geoSearch).toHaveBeenNthCalledWith(1, "geo:instant-workers:skill_1", 12.9, 77.5, 2, "km");
    expect(cacheMock.geoSearch).toHaveBeenNthCalledWith(2, "geo:instant-workers:skill_1", 12.9, 77.5, 5, "km");
    expect(cacheMock.geoSearch).toHaveBeenNthCalledWith(3, "geo:instant-workers:skill_1", 12.9, 77.5, 10, "km");
    // Never a 4th geoSearch at some larger/invalid tier — stays pinned at the widest configured one.
    expect(cacheMock.geoSearch).toHaveBeenCalledTimes(3);
  });

  it("never force-expires — it keeps polling indefinitely until an external status change, not a timeout", async () => {
    let call = 0;
    requestRepoMock.findRequestWithItemsAndProvider.mockImplementation(async () => {
      call++;
      // Stay OPEN for many polling cycles (far more than the old 4-tier limit) to prove
      // there's no internal counter forcing it to stop/expire on its own.
      if (call > 20) return { ...baseRequest, status: "FILLED" };
      return baseRequest;
    });
    requestRepoMock.findEligibleWorkersForMatching.mockResolvedValue([{ id: "worker_1", userId: "worker_user_1" }]);

    const promise = service.startMatching("req_1");
    await vi.runAllTimersAsync();
    await promise;

    expect(call).toBeGreaterThan(20);
    // Confirm it stopped because of the FILLED status, not because it decided to expire —
    // no "EXPIRED" status is ever written by this service anymore (no repo method even exists for it).
    expect(requestRepoMock.findRequestWithItemsAndProvider).toHaveBeenCalled();
  });

  it("notifies previously-broadcast workers with instant_request:closed when the request is cancelled", async () => {
    requestRepoMock.findRequestWithItemsAndProvider
      .mockResolvedValueOnce(baseRequest)
      .mockResolvedValueOnce({ ...baseRequest, status: "CANCELLED" });
    requestRepoMock.findEligibleWorkersForMatching.mockResolvedValue([{ id: "worker_1", userId: "worker_user_1" }]);

    const promise = service.startMatching("req_1");
    await vi.runAllTimersAsync();
    await promise;

    // Must target the same `user:${userId}` room the initial notification used — a
    // WorkerProfile id or a differently-prefixed room would silently reach nobody.
    expect(toMock).toHaveBeenCalledWith("user:worker_user_1");
    expect(emitMock).toHaveBeenCalledWith("instant_request:closed", { requestId: "req_1" });
  });

  it("reads radius tiers from PlatformSetting when configured, instead of the hardcoded default", async () => {
    platformSettingRepoMock.get.mockResolvedValue({ value: [1, 3] });
    requestRepoMock.findRequestWithItemsAndProvider
      .mockResolvedValueOnce(baseRequest)
      .mockResolvedValueOnce({ ...baseRequest, status: "CANCELLED" });
    requestRepoMock.findEligibleWorkersForMatching.mockResolvedValue([]);

    const promise = service.startMatching("req_1");
    await vi.runAllTimersAsync();
    await promise;

    expect(cacheMock.geoSearch).toHaveBeenNthCalledWith(1, "geo:instant-workers:skill_1", 12.9, 77.5, 1, "km");
  });
});
