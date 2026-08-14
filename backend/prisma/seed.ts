import prisma from "../src/shared/config/prisma.js";

async function main() {
  // 1. Seed Skills
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
        rateUnit: "HOURLY",
      },
    });
  }
  console.log("✅ Skills seeded successfully");

  // 2. Seed Platform Settings
  const settings = [
    { key: "commissionPercent", value: 15 },
    { key: "instantRequestRadiusTiers", value: [2, 5, 10] },
    { key: "distanceRatePerKm", value: 5 },
    { key: "otpMaxAttempts", value: 5 },
    { key: "highDemandThreshold", value: 1.5 },
    { key: "surgeFlatFee", value: 100 },
    { key: "surgeMultiplier", value: 1.2 },
  ];

  for (const s of settings) {
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }
  console.log("✅ Platform settings seeded successfully");

  // 3. Seed Notification Templates
  const templates = [
    {
      type: "OTP_LOGIN",
      channel: "EMAIL",
      locale: "en",
      subject: "Your SHRAM Login OTP",
      body: "Your SHRAM login OTP is {{otp}}. It expires in {{expiryMinutes}} minutes. Do not share.",
      variables: ["otp", "expiryMinutes"],
    },
    {
      type: "OTP_LOGIN",
      channel: "SMS",
      locale: "en",
      body: "Your SHRAM login OTP is {{otp}}. Valid for {{expiryMinutes}} minutes.",
      variables: ["otp", "expiryMinutes"],
    },
    {
      type: "OTP_WORK_START",
      channel: "SMS",
      locale: "en",
      body: "SHRAM: Your work-start OTP for booking #{{bookingShortId}} is {{otp}}. Share this with the worker to begin.",
      variables: ["bookingShortId", "otp"],
    },
    {
      type: "WELCOME",
      channel: "EMAIL",
      locale: "en",
      subject: "Welcome to SHRAM!",
      body: "Hi {{name}}, welcome to SHRAM — connect with workers and get jobs done instantly.",
      variables: ["name"],
    },
    {
      type: "BOOKING_CREATED",
      channel: "EMAIL",
      locale: "en",
      subject: "New Booking Created",
      body: "Hi {{name}}, your booking #{{bookingId}} has been created successfully.",
      variables: ["name", "bookingId"],
    },
    {
      type: "BOOKING_CONFIRMED",
      channel: "EMAIL",
      locale: "en",
      subject: "Booking Confirmed!",
      body: "Hi {{providerName}}, your booking #{{bookingShortId}} is confirmed. Worker {{workerName}} is assigned.",
      variables: ["providerName", "bookingShortId", "workerName"],
    },
    {
      type: "BOOKING_CONFIRMED",
      channel: "SMS",
      locale: "en",
      body: "Hi {{providerName}}, your booking #{{bookingShortId}} is confirmed. Worker {{workerName}} will arrive at {{scheduledTime}}.",
      variables: ["providerName", "bookingShortId", "workerName", "scheduledTime"],
    },
  ];

  for (const t of templates) {
    await prisma.notificationTemplate.upsert({
      where: {
        type_channel_locale: {
          type: t.type,
          channel: t.channel,
          locale: t.locale,
        },
      },
      update: {
        subject: t.subject ?? null,
        body: t.body,
        variables: t.variables,
      },
      create: {
        type: t.type,
        channel: t.channel,
        locale: t.locale,
        subject: t.subject ?? null,
        body: t.body,
        variables: t.variables,
      },
    });
  }
  console.log("✅ Notification templates seeded successfully");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
