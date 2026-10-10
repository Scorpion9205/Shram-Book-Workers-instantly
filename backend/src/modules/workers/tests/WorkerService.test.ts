import { describe, it, expect, vi, beforeEach } from "vitest";
import { WorkerService } from "../services/WorkerService.js";
import { BusinessException } from "../../../core/exceptions/index.js";

describe("WorkerService.updateAvailability", () => {
  let workerRepoMock: any;
  let cacheMock: any;
  let service: WorkerService;

  const baseProfile = {
    id: "worker_1",
    userId: "user_1",
    isAvailable: false,
    latitude: null,
    longitude: null,
    user: { isActive: true },
    skills: [{ skillId: "skill_1" }],
  };

  beforeEach(() => {
    workerRepoMock = {
      getProfileWithSkillsAndUser: vi.fn().mockResolvedValue(baseProfile),
      updateAvailability: vi.fn().mockResolvedValue({ ...baseProfile, isAvailable: true }),
    };
    cacheMock = {
      geoAdd: vi.fn(),
      geoRemove: vi.fn(),
    };
    service = new WorkerService(workerRepoMock, cacheMock);
  });

  it("rejects going online when the worker has no known location", async () => {
    await expect(service.updateAvailability("user_1", true)).rejects.toThrow(BusinessException);
    expect(workerRepoMock.updateAvailability).not.toHaveBeenCalled();
    expect(cacheMock.geoAdd).not.toHaveBeenCalled();
  });

  it("allows going online and syncs the geo index once a location is known", async () => {
    workerRepoMock.getProfileWithSkillsAndUser.mockResolvedValue({
      ...baseProfile,
      latitude: 12.9,
      longitude: 77.5,
    });

    await service.updateAvailability("user_1", true);

    expect(workerRepoMock.updateAvailability).toHaveBeenCalledWith("user_1", true);
    expect(cacheMock.geoAdd).toHaveBeenCalledWith("geo:instant-workers:skill_1", {
      lat: 12.9,
      lng: 77.5,
      member: "worker_1",
    });
  });

  it("allows going offline regardless of location, and removes the worker from the geo index", async () => {
    await service.updateAvailability("user_1", false);

    expect(workerRepoMock.updateAvailability).toHaveBeenCalledWith("user_1", false);
    expect(cacheMock.geoRemove).toHaveBeenCalledWith("geo:instant-workers:skill_1", "worker_1");
  });
});
