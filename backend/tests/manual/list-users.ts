// Manual smoke test — not part of the build or CI. Run with: tsx tests/manual/list-users.ts
import prisma from "../../src/shared/config/prisma.js";

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, phone: true, email: true, role: true },
  });
  console.log("Users in database:", users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
