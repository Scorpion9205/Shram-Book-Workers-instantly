import prisma from "../src/shared/config/prisma.js";

async function main() {
  const skills = [
    { name: "Daily Wage Labour", baseRate: 400 },
    { name: "Construction Labour", baseRate: 450 },
    { name: "Helper", baseRate: 350 },
    { name: "Plumber", baseRate: 600 },
    { name: "Electrician", baseRate: 650 },
    { name: "Painter", baseRate: 500 },
    { name: "Mason", baseRate: 550 },
    { name: "Carpenter", baseRate: 600 },
    { name: "Welder", baseRate: 650 },
    { name: "Tile Worker", baseRate: 700 },
    { name: "POP Worker", baseRate: 600 },
    { name: "AC Technician", baseRate: 800 },
    { name: "CCTV Technician", baseRate: 850 },
    { name: "RO Technician", baseRate: 750 },
    { name: "House Cleaner", baseRate: 400 },
    { name: "Gardener", baseRate: 450 },
  ];

  for (const s of skills) {
    await prisma.skill.upsert({
      where: {
        name: s.name,
      },
      update: {
        baseRate: s.baseRate,
      },
      create: {
        name: s.name,
        baseRate: s.baseRate,
      },
    });
  }

  console.log("✅ Skills seeded successfully");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
