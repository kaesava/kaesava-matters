-- Idempotently register Tradie Matters in the platform apps registry.
-- Safe to run on production databases with existing Money Matters tenants.
INSERT INTO "apps" ("id", "name", "slug", "feature_flags")
VALUES ('5cb11fa2-7faf-49d3-9e3a-01f14d2a7b99', 'Tradie Matters', 'tradie-matters', '{}'::jsonb)
ON CONFLICT ("id") DO NOTHING;
