-- Additive 2-layer RBAC column: allows Ring 3 apps (e.g. TradieMatters) to store
-- granular app-specific roles (COORDINATOR, TRADIE, APPRENTICE) alongside platform base role.
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "app_role" varchar(50);
