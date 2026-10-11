import { describe, it, expect, vi, beforeEach } from "vitest";
import { SkillRepository } from "../repositories/SkillRepository.js";

describe("SkillRepository.replaceWorkerSkills", () => {
  let prismaServiceMock: any;
  let repo: SkillRepository;

  beforeEach(() => {
    prismaServiceMock = {
      client: {
        workerSkill: { deleteMany: vi.fn(), createMany: vi.fn() },
        $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
      },
    };
    repo = new SkillRepository(prismaServiceMock);
  });

  it("runs the delete and create inside a single transaction, not as two independent writes", async () => {
    await repo.replaceWorkerSkills("worker_1", ["skill_1", "skill_2"]);

    expect(prismaServiceMock.client.$transaction).toHaveBeenCalledTimes(1);
    const txArg = prismaServiceMock.client.$transaction.mock.calls[0][0];
    expect(txArg).toHaveLength(2);
    expect(prismaServiceMock.client.workerSkill.deleteMany).toHaveBeenCalledWith({ where: { workerId: "worker_1" } });
    expect(prismaServiceMock.client.workerSkill.createMany).toHaveBeenCalledWith({
      data: [
        { workerId: "worker_1", skillId: "skill_1" },
        { workerId: "worker_1", skillId: "skill_2" },
      ],
    });
  });

  it("never leaves the worker with zero skills if the transaction itself fails", async () => {
    prismaServiceMock.client.$transaction.mockRejectedValue(new Error("DB connection lost"));

    await expect(repo.replaceWorkerSkills("worker_1", ["skill_1"])).rejects.toThrow("DB connection lost");
  });
});
