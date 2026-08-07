import prisma from "./shared/config/prisma.js";
import { RedisService } from "./shared/services/redis/redis.service.js";

async function main() {
  console.log("--- DIAGNOSING MATCHING LOOP ---");
  
  // Find the latest open request
  const request = await prisma.instantRequest.findFirst({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: { skill: true, items: true }
  });

  if (!request) {
    console.log("No open instant request found in database!");
    return;
  }

  console.log(`Latest Open Request: ${request.title} (ID: ${request.id})`);
  console.log(`- Latitude: ${request.latitude}, Longitude: ${request.longitude}`);
  console.log(`- skillId: ${request.skillId} (${request.skill?.name})`);

  const stages = [2, 5, 15, 30];
  for (const radius of stages) {
    console.log(`\n--- Stage: ${radius}km ---`);
    const workerIds = await RedisService.geoSearch(
      `geo:instant-workers:${request.skillId}`,
      request.longitude,
      request.latitude,
      radius
    );
    console.log(`- Redis GEO Search found worker IDs:`, workerIds);

    const eligibleWorkers = await prisma.workerProfile.findMany({
      where: {
        id: { in: workerIds },
        isAvailable: true,
        user: { role: "WORKER" },
        skills: {
          some: {
            skillId: request.skillId || ""
          }
        }
      },
      include: { user: { include: { location: true } } }
    });

    console.log(`- DB Query found eligible workers:`, eligibleWorkers.map(w => ({
      id: w.id,
      name: w.user.name,
      isAvailable: w.isAvailable,
      role: w.user.role,
      location: w.user.location
    })));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
