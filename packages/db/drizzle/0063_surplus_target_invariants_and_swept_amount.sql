ALTER TABLE "allocation_plan_lines" ADD COLUMN IF NOT EXISTS "swept_amount" numeric(12, 2);

-- 1. Clear surplus target flag on any archived or private envelopes
UPDATE "envelopes"
SET "is_surplus_target" = false
WHERE "is_surplus_target" = true
  AND ("archived_at" IS NOT NULL OR "is_private" = true);

-- 2. If any (tenant_id, app_id) has >1 active shared surplus target, keep only the earliest one
WITH ranked_targets AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "tenant_id", "app_id"
      ORDER BY "created_at" ASC, "id" ASC
    ) AS rn
  FROM "envelopes"
  WHERE "is_surplus_target" = true
    AND "is_private" = false
    AND "archived_at" IS NULL
)
UPDATE "envelopes" e
SET "is_surplus_target" = false
FROM ranked_targets r
WHERE e."id" = r."id"
  AND r.rn > 1;

-- 3. For any active (tenant_id, app_id) with 0 active shared surplus targets, promote its shared EVERYDAY envelope (or earliest active shared envelope)
WITH tenants_without_target AS (
  SELECT DISTINCT e."tenant_id", e."app_id"
  FROM "envelopes" e
  WHERE e."archived_at" IS NULL
    AND e."is_private" = false
  EXCEPT
  SELECT DISTINCT e."tenant_id", e."app_id"
  FROM "envelopes" e
  WHERE e."archived_at" IS NULL
    AND e."is_private" = false
    AND e."is_surplus_target" = true
),
fallback_candidates AS (
  SELECT
    e."id",
    ROW_NUMBER() OVER (
      PARTITION BY e."tenant_id", e."app_id"
      ORDER BY CASE WHEN e."envelope_type" = 'EVERYDAY' THEN 0 ELSE 1 END, e."created_at" ASC, e."id" ASC
    ) AS rn
  FROM "envelopes" e
  INNER JOIN tenants_without_target t
    ON t."tenant_id" = e."tenant_id"
   AND t."app_id" = e."app_id"
  WHERE e."archived_at" IS NULL
    AND e."is_private" = false
)
UPDATE "envelopes" e
SET "is_surplus_target" = true
FROM fallback_candidates f
WHERE e."id" = f."id"
  AND f.rn = 1;

-- 4. Enforce DB invariants: surplus target must be shared, and at most one active surplus target per (tenant_id, app_id)
ALTER TABLE "envelopes"
  DROP CONSTRAINT IF EXISTS "envelopes_surplus_target_must_be_shared";
ALTER TABLE "envelopes"
  ADD CONSTRAINT "envelopes_surplus_target_must_be_shared"
  CHECK (NOT ("is_surplus_target" AND "is_private"));

CREATE UNIQUE INDEX IF NOT EXISTS "envelopes_single_surplus_target_idx"
  ON "envelopes" ("tenant_id", "app_id")
  WHERE "is_surplus_target" = true AND "archived_at" IS NULL;
