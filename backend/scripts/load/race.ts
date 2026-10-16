import prisma from "../../src/shared/config/prisma.js";
import { readFileSync } from "fs";
const fixtures = JSON.parse(readFileSync(new URL("../../../load-tests/fixtures.json", import.meta.url), "utf8"));

const BASE = "http://localhost:5000/api/v1";

async function api(method: string, path: string, token: string, body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => ({})) as any };
}

let failed = false;
function assert(cond: any, msg: string) {
  if (!cond) { console.error(`❌ FAIL: ${msg}`); failed = true; } else console.log(`✅ ${msg}`);
}

async function raceInstantItem() {
  console.log("\n=== Race 1: 30 workers accept the same 1-slot instant-request item ===");
  const items = [{ skillId: fixtures.plumberSkillId, requiredWorkers: 1 }];
  const fare = await api("POST", "/instant-requests/calculate-fare", fixtures.provider.token, { items });
  const created = await api("POST", "/instant-requests", fixtures.provider.token, {
    title: "Race test", latitude: 28.6, longitude: 77.2, bookingMode: "DIRECT", quoteId: fare.json?.data?.quoteId, items,
  });
  const request = created.json?.data?.request;
  assert(created.status === 201 && request, `instant request created (${created.status})`);
  const itemId = request.items[0].id;

  const t0 = Date.now();
  const results = await Promise.all(
    fixtures.workers.map((w) => api("POST", `/instant-requests/items/${itemId}/accept`, w.token)),
  );
  const ms = Date.now() - t0;
  const ok = results.filter((r) => r.status === 200 || r.status === 201);
  const byCode = results.reduce<Record<string, number>>((acc, r) => {
    const k = `${r.status}:${r.json?.errorCode ?? "ok"}`; acc[k] = (acc[k] ?? 0) + 1; return acc;
  }, {});
  console.log(`${results.length} concurrent accepts finished in ${ms}ms`, byCode);

  assert(ok.length === 1, `exactly 1 accept succeeded (got ${ok.length})`);
  assert(!results.some((r) => r.status >= 500), `no 5xx under contention`);
  const bookings = await prisma.booking.count({ where: { instantRequestId: request.id } });
  assert(bookings === 1, `exactly 1 booking row exists in DB (got ${bookings})`);
  const item = await prisma.instantRequestItem.findUniqueOrThrow({ where: { id: itemId } });
  assert(item.acceptedWorkers === 1, `item.acceptedWorkers == 1 (got ${item.acceptedWorkers})`);
}

async function raceAgentDoubleAssign() {
  console.log("\n=== Race 2: Agent assigns ONE roster worker to 2 applications simultaneously ===");
  const { agent, provider, plumberSkillId } = fixtures;
  const w = await api("POST", "/agents/workers", agent.token, { name: "Race Roster Worker", skillIds: [plumberSkillId] });
  const workerId = w.json?.data?.workerId;
  await api("PATCH", `/agents/workers/${workerId}/availability`, agent.token, { isAvailable: true, latitude: 28.6, longitude: 77.2 });

  const appIds: string[] = [];
  for (let i = 0; i < 2; i++) {
    const job = await api("POST", "/jobs/create-job", provider.token, { title: `Race job ${i}`, skillId: plumberSkillId, requiredWorkers: 1, budget: 1000 });
    const jobId = job.json?.data?.id;
    await api("POST", `/jobs/${jobId}/apply`, agent.token, { bidAmount: 1000, workerCount: 1 });
    const apps = await api("GET", `/jobs/${jobId}/applications`, provider.token);
    const appId = (Array.isArray(apps.json?.data) ? apps.json.data : apps.json?.data?.applications)?.[0]?.id;
    await api("PATCH", `/jobs/applications/${appId}/accept`, provider.token, { paymentMode: "OFFLINE" });
    appIds.push(appId);
  }

  const results = await Promise.all(
    appIds.map((id) => api("POST", `/agents/applications/${id}/assign-worker`, agent.token, { workerId })),
  );
  const ok = results.filter((r) => r.status === 201);
  console.log(results.map((r) => `${r.status}:${r.json?.errorCode ?? "ok"}`));
  assert(ok.length === 1, `exactly 1 of 2 simultaneous assignments succeeded (got ${ok.length})`);
  assert(!results.some((r) => r.status >= 500), `no 5xx under contention`);
  const active = await prisma.booking.count({ where: { workerId, status: "WORKER_ASSIGNED" } });
  assert(active === 1, `worker has exactly 1 active booking (got ${active})`);
}

async function main() {
  await raceInstantItem();
  await raceAgentDoubleAssign();
  console.log(failed ? "\nRACE TESTS FAILED" : "\nAll race tests passed");
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
