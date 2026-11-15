-- Migration 0061: Add per-user telemetry_consent column to user_preferences
ALTER TABLE "user_preferences"
  ADD COLUMN IF NOT EXISTS "telemetry_consent" varchar(16);
