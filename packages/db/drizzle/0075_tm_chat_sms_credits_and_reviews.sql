CREATE TABLE IF NOT EXISTS "chat_rooms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entity_type" varchar(40) NOT NULL,
  "entity_id" uuid NOT NULL,
  "title" varchar(255) NOT NULL,
  "is_pinned" boolean DEFAULT false NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "app_id" uuid NOT NULL REFERENCES "apps"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id"),
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id"),
  "archived_at" timestamptz,
  "archived_by" uuid REFERENCES "users"("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "room_id" uuid NOT NULL REFERENCES "chat_rooms"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL,
  "role" varchar(24) DEFAULT 'MEMBER' NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "app_id" uuid NOT NULL REFERENCES "apps"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id"),
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id"),
  "archived_at" timestamptz,
  "archived_by" uuid REFERENCES "users"("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "room_id" uuid NOT NULL REFERENCES "chat_rooms"("id") ON DELETE CASCADE,
  "sender_user_id" uuid NOT NULL,
  "body" text NOT NULL,
  "reply_to_message_id" uuid,
  "mentioned_user_ids_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "app_id" uuid NOT NULL REFERENCES "apps"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id"),
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id"),
  "archived_at" timestamptz,
  "archived_by" uuid REFERENCES "users"("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_reads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "room_id" uuid NOT NULL REFERENCES "chat_rooms"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL,
  "last_read_at" timestamptz DEFAULT now() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "app_id" uuid NOT NULL REFERENCES "apps"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id"),
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id"),
  "archived_at" timestamptz,
  "archived_by" uuid REFERENCES "users"("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tm_phone_numbers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "e164_number" varchar(32) NOT NULL,
  "twilio_phone_sid" varchar(64) NOT NULL,
  "missed_call_auto_text_enabled" boolean DEFAULT true NOT NULL,
  "missed_call_template" text,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "app_id" uuid NOT NULL REFERENCES "apps"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id"),
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id"),
  "archived_at" timestamptz,
  "archived_by" uuid REFERENCES "users"("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tm_sms_credit_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "credits_delta" integer NOT NULL,
  "reason" varchar(40) NOT NULL,
  "stripe_checkout_session_id" varchar(255),
  "comm_log_id" uuid REFERENCES "tm_comm_logs"("id"),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "app_id" uuid NOT NULL REFERENCES "apps"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id"),
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id"),
  "archived_at" timestamptz,
  "archived_by" uuid REFERENCES "users"("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tm_review_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid REFERENCES "tm_jobs"("id"),
  "invoice_id" uuid REFERENCES "tm_invoices"("id"),
  "customer_id" uuid NOT NULL REFERENCES "tm_customers"("id"),
  "google_review_url" text,
  "rating_score" integer,
  "redirected_to_google_at" timestamptz,
  "sent_at" timestamptz DEFAULT now() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "app_id" uuid NOT NULL REFERENCES "apps"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id"),
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id"),
  "archived_at" timestamptz,
  "archived_by" uuid REFERENCES "users"("id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_rooms_entity_idx" ON "chat_rooms" ("tenant_id", "app_id", "entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "chat_members_room_user_idx" ON "chat_members" ("room_id", "user_id");
CREATE INDEX IF NOT EXISTS "chat_messages_room_created_idx" ON "chat_messages" ("room_id", "created_at");
CREATE INDEX IF NOT EXISTS "chat_reads_room_user_idx" ON "chat_reads" ("room_id", "user_id");
CREATE INDEX IF NOT EXISTS "tm_phone_numbers_e164_idx" ON "tm_phone_numbers" ("e164_number");
CREATE INDEX IF NOT EXISTS "tm_sms_credit_entries_tenant_idx" ON "tm_sms_credit_entries" ("tenant_id", "app_id");
CREATE INDEX IF NOT EXISTS "tm_review_requests_customer_idx" ON "tm_review_requests" ("customer_id");
--> statement-breakpoint
ALTER TABLE "chat_rooms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_rooms" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_rooms_tenant_isolation" ON "chat_rooms";
CREATE POLICY "chat_rooms_tenant_isolation" ON "chat_rooms"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "chat_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_members" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_members_tenant_isolation" ON "chat_members";
CREATE POLICY "chat_members_tenant_isolation" ON "chat_members"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_messages" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_messages_tenant_isolation" ON "chat_messages";
CREATE POLICY "chat_messages_tenant_isolation" ON "chat_messages"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "chat_reads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_reads" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_reads_tenant_isolation" ON "chat_reads";
CREATE POLICY "chat_reads_tenant_isolation" ON "chat_reads"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_phone_numbers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_phone_numbers" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_phone_numbers_tenant_isolation" ON "tm_phone_numbers";
CREATE POLICY "tm_phone_numbers_tenant_isolation" ON "tm_phone_numbers"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_sms_credit_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_sms_credit_entries" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_sms_credit_entries_tenant_isolation" ON "tm_sms_credit_entries";
CREATE POLICY "tm_sms_credit_entries_tenant_isolation" ON "tm_sms_credit_entries"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_review_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_review_requests" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_review_requests_tenant_isolation" ON "tm_review_requests";
CREATE POLICY "tm_review_requests_tenant_isolation" ON "tm_review_requests"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
