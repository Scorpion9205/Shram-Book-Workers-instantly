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
  let mapsProviderMock: any;
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
      findEligibleWorkersBySkill: vi.fn(),
      findAllOpenRequestIds: vi.fn().mockResolvedValue([]),
    };
    cacheMock = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn(),
      geoSearch: vi.fn().mockResolvedValue([]),
    };
    platformSettingRepoMock = {
      get: vi.fn().mockResolvedValue(null), // no override -> defaults apply
    };
    mapsProviderMock = {
      getDistanceKm: vi.fn().mockResolvedValue(3),
      getRoute: vi.fn().mockResolvedValue({ distanceKm: 3.2, durationMinutes: 8 }),
    };

    service = new InstantMatchingService(requestRepoMock, cacheMock, platformSettingRepoMock, mapsProviderMock);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("notifies every eligible worker with the skill and never does a distance (GEO) search", async () => {
    requestRepoMock.findRequestWithItemsAndProvider
      .mockResolvedValueOnce(baseRequest)
      .mockResolvedValueOnce({ ...baseRequest, status: "CANCELLED" });
    requestRepoMock.findEligibleWorkersBySkill.mockResolvedValue([
      { id: "worker_1", userId: "worker_user_1" },
      { id: "worker_2", userId: "worker_user_2" },
    ]);

    const promise = service.startMatching("req_1");
    await vi.runAllTimersAsync();
    await promise;

    expect(requestRepoMock.findEligibleWorkersBySkill).toHaveBeenCalledWith("skill_1");
    expect(cacheMock.geoSearch).not.toHaveBeenCalled();
    expect(toMock).toHaveBeenCalledWith("user:worker_user_1");
    expect(toMock).toHaveBeenCalledWith("user:worker_user_2");
    expect(emitMock).toHaveBeenCalledWith("newInstantRequest", expect.anything());
  });

  it("does not notify the same worker twice across polling rounds", async () => {
    requestRepoMock.findRequestWithItemsAndProvider
      .mockResolvedValueOnce(baseRequest)
      .mockResolvedValueOnce(baseRequest)
      .mockResolvedValueOnce({ ...baseRequest, status: "CANCELLED" });
    requestRepoMock.findEligibleWorkersBySkill.mockResolvedValue([{ id: "worker_1", userId: "worker_user_1" }]);

    const promise = service.startMatching("req_1");
    await vi.runAllTimersAsync();
    await promise;

    const newRequestEmits = emitMock.mock.calls.filter(([event]) => event === "newInstantRequest");
    expect(newRequestEmits).toHaveLength(1);
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
    requestRepoMock.findEligibleWorkersBySkill.mockResolvedValue([{ id: "worker_1", userId: "worker_user_1" }]);

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
    requestRepoMock.findEligibleWorkersBySkill.mockResolvedValue([{ id: "worker_1", userId: "worker_user_1" }]);

    const promise = service.startMatching("req_1");
    await vi.runAllTimersAsync();
    await promise;

    // Must target the same `user:${userId}` room the initial notification used — a
    // WorkerProfile id or a differently-prefixed room would silently reach nobody.
    expect(toMock).toHaveBeenCalledWith("user:worker_user_1");
    expect(emitMock).toHaveBeenCalledWith("instant_request:closed", { requestId: "req_1" });
  });

  it("notifies a worker with real road distance/ETA from the maps provider, not a placeholder", async () => {
    requestRepoMock.findRequestWithItemsAndProvider
      .mockResolvedValueOnce(baseRequest)
      .mockResolvedValueOnce({ ...baseRequest, status: "CANCELLED" });
    requestRepoMock.findEligibleWorkersBySkill.mockResolvedValue([
      { id: "worker_1", userId: "worker_user_1", latitude: 12.91, longitude: 77.51 },
    ]);

    const promise = service.startMatching("req_1");
    await vi.runAllTimersAsync();
    await promise;

    expect(mapsProviderMock.getRoute).toHaveBeenCalledWith(
      { lat: 12.91, lng: 77.51 },
      { lat: 12.9, lng: 77.5 },
    );
    expect(emitMock).toHaveBeenCalledWith(
      "newInstantRequest",
      expect.objectContaining({
        request: expect.objectContaining({ distanceKm: 3.2, estimatedMinutes: 8 }),
      }),
    );
  });

  it("skips the route lookup and reports zero distance/ETA when the worker has no known location", async () => {
    requestRepoMock.findRequestWithItemsAndProvider
      .mockResolvedValueOnce(baseRequest)
      .mockResolvedValueOnce({ ...baseRequest, status: "CANCELLED" });
    requestRepoMock.findEligibleWorkersBySkill.mockResolvedValue([
      { id: "worker_1", userId: "worker_user_1", latitude: null, longitude: null },
    ]);

    const promise = service.startMatching("req_1");
    await vi.runAllTimersAsync();
    await promise;

    expect(mapsProviderMock.getRoute).not.toHaveBeenCalled();
    expect(emitMock).toHaveBeenCalledWith(
      "newInstantRequest",
      expect.objectContaining({
        request: expect.objectContaining({ distanceKm: 0, estimatedMinutes: 0 }),
      }),
    );
  });
});

describe("InstantMatchingService.resumeAllOpenRequests", () => {
  it("re-launches startMatching for every still-open request found — restart recovery", async () => {
    const requestRepoMock: any = {
      findAllOpenRequestIds: vi.fn().mockResolvedValue(["req_1", "req_2"]),
    };
    const service = new InstantMatchingService(requestRepoMock, {} as any, {} as any, {} as any);
    const startMatchingSpy = vi.spyOn(service, "startMatching").mockResolvedValue(undefined);

    await service.resumeAllOpenRequests();

    expect(startMatchingSpy).toHaveBeenCalledWith("req_1");
    expect(startMatchingSpy).toHaveBeenCalledWith("req_2");
    expect(startMatchingSpy).toHaveBeenCalledTimes(2);
  });

  it("does nothing when there are no open requests", async () => {
    const requestRepoMock: any = { findAllOpenRequestIds: vi.fn().mockResolvedValue([]) };
    const service = new InstantMatchingService(requestRepoMock, {} as any, {} as any, {} as any);
    const startMatchingSpy = vi.spyOn(service, "startMatching").mockResolvedValue(undefined);

    await service.resumeAllOpenRequests();

    expect(startMatchingSpy).not.toHaveBeenCalled();
  });
});
