-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "agentAmount" DECIMAL(65,30),
ADD COLUMN     "workAmount" DECIMAL(65,30);

-- New pricing: provider pays work charge + a flat platform fee + a service-charge percent of the
-- work charge; the worker keeps the whole work charge. The old worker-commission setting is retired.
DELETE FROM "PlatformSetting" WHERE "key" = 'commissionPercent';
INSERT INTO "PlatformSetting" ("key", "value", "updatedAt")
VALUES ('platformFixedFee', '10'::jsonb, NOW()),
       ('serviceChargePercent', '10'::jsonb, NOW())
ON CONFLICT ("key") DO NOTHING;
