-- Make sure the two commission percentages exist so admin can see and edit them in Settings.
-- ON CONFLICT DO NOTHING keeps any value admin has already set.
INSERT INTO "PlatformSetting" ("key", "value", "updatedAt")
VALUES ('commissionPercent', '15'::jsonb, NOW()),
       ('agentCommissionPercent', '3'::jsonb, NOW())
ON CONFLICT ("key") DO NOTHING;
