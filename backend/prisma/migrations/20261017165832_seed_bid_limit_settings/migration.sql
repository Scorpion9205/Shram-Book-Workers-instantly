-- Admin-editable limits on prices: how far a worker's bid may sit below/above the provider's
-- budget (or the skill base rate), and how far a provider's budget may sit from the base rate.
-- ON CONFLICT DO NOTHING keeps any value admin has already set.
INSERT INTO "PlatformSetting" ("key", "value", "updatedAt")
VALUES ('bidMinPercent', '80'::jsonb, NOW()),
       ('bidMaxPercent', '110'::jsonb, NOW()),
       ('budgetMinPercentOfBase', '70'::jsonb, NOW()),
       ('budgetMaxPercentOfBase', '300'::jsonb, NOW())
ON CONFLICT ("key") DO NOTHING;
