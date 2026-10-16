import { writeFileSync } from "fs";
import jwt from "jsonwebtoken";
import prisma from "../../src/shared/config/prisma.js";
import { env } from "../../src/config/env.js";

// Seeds a pool of pre-authenticated users into the LOCAL dev DB (never run against production)
// and writes their JWTs to fixtures.json for the Artillery scenarios / race script to reuse.
const WORKER_COUNT = 30;
const JOB_COUNT = 20;

function token(userId: string, role: string) {
  return jwt.sign({ userId, role }, env.JWT_ACCESS_SECRET, { expiresIn: "2h" });
}

async function main() {
  if (!/localhost|127\.0\.0\.1/.test(env.DATABASE_URL)) {
    throw new Error("Refusing to seed: DATABASE_URL is not local.");
  }
  const ts = Date.now();
  const plumber = await prisma.skill.findFirstOrThrow({ where: { name: "Plumber" } });

  const provider = await prisma.user.create({
    data: {
      name: "Load Provider", email: `lt-provider-${ts}@test.local`, role: "PROVIDER", isVerified: true,
      providerProfile: { create: { companyName: "LT Co", providerType: "COMPANY" } },
    },
  });
  const agent = await prisma.user.create({
    data: {
      name: "Load Agent", email: `lt-agent-${ts}@test.local`, role: "AGENT", isVerified: true,
      agentProfile: { create: { agencyName: "LT Agency" } },
    },
  });

  const workers: { userId: string; profileId: string; token: string }[] = [];
  for (let i = 0; i < WORKER_COUNT; i++) {
    const u = await prisma.user.create({
      data: {
        name: `Load Worker ${i}`, email: `lt-worker-${ts}-${i}@test.local`, role: "WORKER", isVerified: true,
        workerProfile: {
          create: { isAvailable: true, latitude: 28.6, longitude: 77.2, skills: { create: { skillId: plumber.id } } },
        },
      },
      include: { workerProfile: true },
    });
    workers.push({ userId: u.id, profileId: u.workerProfile!.id, token: token(u.id, "WORKER") });
  }

  for (let i = 0; i < JOB_COUNT; i++) {
    await prisma.job.create({
      data: { title: `Load job ${i}`, skillId: plumber.id, requiredWorkers: 1, budget: 1000, providerId: provider.id, latitude: 28.6, longitude: 77.2 },
    });
  }

  const fixtures = {
    plumberSkillId: plumber.id,
    provider: { userId: provider.id, token: token(provider.id, "PROVIDER") },
    agent: { userId: agent.id, token: token(agent.id, "AGENT") },
    workers,
  };
  writeFileSync(new URL("../../../load-tests/fixtures.json", import.meta.url), JSON.stringify(fixtures, null, 2));
  console.log(`Seeded provider, agent, ${WORKER_COUNT} workers, ${JOB_COUNT} jobs -> fixtures.json`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
