import prisma from "../src/shared/config/prisma.js";

async function main() {
  const skills = [
    "Daily Wage Labour",
    "Construction Labour",
    "Helper",
    "Plumber",
    "Electrician",
    "Painter",
    "Mason",
    "Carpenter",
    "Welder",
    "Tile Worker",
    "POP Worker",
    "AC Technician",
    "CCTV Technician",
    "RO Technician",
    "House Cleaner",
    "Gardener",
  ];

  for (const skill of skills) {
    await prisma.skill.upsert({
      where: {
        name: skill,
      },
      update: {},
      create: {
        name: skill,
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
