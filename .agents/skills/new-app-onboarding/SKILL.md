---
name: new-app-onboarding
description: Canonical opinionated runbook for provisioning external infrastructure, environment variables, secrets, DNS, auth, billing, observability, and monorepo wiring when adding a new Kaesava product app (e.g., Tradie Matters) to this monorepo.
---

# New Kaesava App Onboarding Protocol

Use this runbook whenever launching a new product app inside this monorepo (for example, **Tradie Matters** / `tradie-matters`). Every infrastructure choice below is **standardized and opinionated** — follow these defaults unless explicitly overridden.

---

## 1. Naming, Identifiers & Port Allocation Registry

Before touching any dashboard or file, lock in the app's canonical identifiers and reserve the next `+10` local port block:

| App | Prefix (`apps/<prefix>-*`) | Slug (`apps.slug`) | Web Domain | API Domain | Deep Link / Package ID | Dev Web | Dev API | App UUID (`apps.id`) |
| :--- | :--- | :--- | :--- | :--- | :--- | ---: | ---: | :--- |
| **Money Matters** | *(root)* `web` / `api` / `mobile` | `money-matters` | `moneymatters.kaesava.au` | `api.moneymatters.kaesava.au` | `moneymatters://` / `au.kaesava.moneymatters` | `3000` | `3001` | `01908bde-34bb-7b19-a178-574211bc93aa` |
| **Tradie Matters** | `tradie` (`tradie-web`, `tradie-api`, `tradie-mobile`) | `tradie-matters` | `tradiematters.kaesava.au` | `api.tradiematters.kaesava.au` | `tradiematters://` / `au.kaesava.tradiematters` | `3010` | `3011` | `5cb11fa2-7faf-49d3-9e3a-01f14d2a7b99` |
| **App #3** | `<prefix>` | `<slug>` | `<subd>.kaesava.au` | `api.<subd>.kaesava.au` | `<subd>://` / `au.kaesava.<subd>` | `3020` | `3021` | *(generate UUIDv7)* |

Generate the permanent UUIDv7 once:
```bash
node -e 'console.log(crypto.randomUUID())'
```
*(Or generate a time-ordered UUIDv7 via `uuid` v7 — once seeded into `apps.id`, **never change it**.)*

### How Local Dev Resolves `/`
- Each product is a **separate workspace** (`apps/<prefix>-web`, `apps/<prefix>-api`, `apps/<prefix>-mobile`), never multiplexed inside `apps/web`.
- Dev routing is **by port** (including dedicated `workerd` DevTools inspector ports so multiple `wrangler dev` workers can run concurrently without `127.0.0.1:9229` collisions):
  - `http://localhost:3000/` → Money Matters Web → `http://localhost:3001` (API, Inspector `:9229`)
  - `http://localhost:3010/` → Tradie Matters Web → `http://localhost:3011` (API, Inspector `:9230`)
  - App #3: Web `:3020` → API `:3021` (Inspector `:9231`)
- `apps/<slug>/api/src/worker.ts` passes `resolveDefaultAppId: (env) => env.<PREFIX>_APP_ID` into `createPlatformWorker()`, and `apps/<slug>/web` forwards `x-app-id: <APP_ID>` from `NEXT_PUBLIC_APP_ID` in its `/api/trpc/[trpc]` proxy.
- Start all 5 local dev servers (`mm:web`, `mm:api`, `tm:web`, `tm:api`, and `inngest`) with one command:
  ```bash
  pnpm start:all
  ```

---

## 2. Canonical External Provisioning Decisions (No Choices — Standard Architecture)

| Layer | Standard Decision | Exact Provisioning Action |
| :--- | :--- | :--- |
| **Neon PostgreSQL** | **SHARE** existing Neon project (Dev & Prod branches) | Reuse `DATABASE_URL`. Insert new row into `apps` table via `packages/db/src/seed.ts`. |
| **Neon Auth (Better Auth)** | **SHARE** existing Neon Auth instances | Add new Web & API origins to **Trusted Origins** on both Dev and Prod branches. |
| **Google OAuth 2.0** | **SHARE** existing Google OAuth Client | Add `https://<subd>.kaesava.au` to **Authorized JavaScript origins** (Redirect URI stays unchanged). |
| **Cloudflare DNS & Workers** | **DEDICATED** Workers on shared `kaesava.au` zone | Deploy `<slug>-web` and `<slug>-api` with `custom_domain = true` (Cloudflare auto-provisions proxied DNS + TLS 1.3). |
| **Inbound Support Email** | **DEDICATED** subdomain address via Cloudflare Email Routing | Route `info@<subd>.kaesava.au` → your central inbox. |
| **Outbound Email (Resend)** | **SHARED** Resend account, **DEDICATED** verified domain & scoped API key | Verify `<subd>.kaesava.au` (SPF/DKIM/DMARC in Cloudflare DNS) and mint a domain-scoped `RESEND_API_KEY`. |
| **Cloudflare R2 Storage** | **DEDICATED** buckets (`<slug>-production`, `<slug>-dev`) + scoped token | Keep clean billing & blast-radius isolation (keys still prefix `apps/${appId}/...`). |
| **Cloudflare AI Gateway** | **DEDICATED** gateway (`<slug>-ai-prod`, `<slug>-ai-dev`) | Reuse `CF_ACCOUNT_ID` and `CF_AI_API_TOKEN`; separate gateway isolates AI logs & rate controls. |
| **Upstash Redis** | **SHARE** existing Upstash Redis (`ap-southeast-1`) | Reuse `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` on both `<slug>-api` and `<slug>-web`. |
| **Inngest Cloud** | **SHARE** account/keys, **DEDICATED** Inngest App ID | Instantiate `new Inngest({ id: "<slug>-api-service" })` and sync `https://api.<subd>.kaesava.au/api/inngest`. |
| **Stripe Billing** | **DEDICATED** Stripe sub-account under Kaesava AU | Gives isolated Checkout branding, invoices, statement descriptor, Prices, and Webhook secret. |
| **Sentry** | **SHARE** org, **DEDICATED** projects | Create `<slug>-web`, `<slug>-api`, and `<slug>-mobile`. |
| **PostHog** | **SHARE** single project (free tier limit = 1 project) | Reuse existing `phc_...` token (`https://us.i.posthog.com`); filter insights by `app_id` / `$host`. |
| **GA4 & Search Console** | **DEDICATED** property & web stream | Create GA4 Web Stream + Search Console property for `https://<subd>.kaesava.au`. |
| **Expo / EAS / FCM / Play** | **DEDICATED** EAS project, Firebase Android app & Play Console app | Run `eas init`, register `au.kaesava.<subd>` in Firebase + Play Console; reuse `EXPO_ACCESS_TOKEN`. |
| **GitHub Actions Secrets** | **SHARE** existing repo secrets | Reuse `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `DATABASE_URL`, `TEST_DATABASE_URL`. |

---

## 3. Step-by-Step External Setup Runbook (Execute in Order)

### Step 1: Neon Auth & Google OAuth (Unblocks Local & Prod Sign-In)
1. **Neon Console (`kaesava-matters` project):**
   - **Dev Branch (`ep-icy-resonance-a7s94hg4...`):** Already has **Allow Localhost** enabled and Tailscale Funnel origin configured — **no changes needed** for new apps.
   - **Prod Branch (`ep-spring-snow-a70f61xz...`):** Already has `https://*.kaesava.au` in Trusted Origins — **no changes needed** for new top-level `*.kaesava.au` subdomains (only add `https://api.<subd>.kaesava.au` if an API route ever sends a browser `Origin` directly to Neon Auth).
2. **Google Cloud Console (`kaesava-matters` / `money-matters-504311`) → APIs & Services → Credentials:**
   - Open OAuth 2.0 Web Client **`kaesava-matters-prod`**:
     - Under **Authorized JavaScript origins**, add `https://<subd>.kaesava.au`.
     - Leave **Authorized redirect URIs** untouched (`https://ep-spring-snow-a70f61xz.neonauth.ap-southeast-2.aws.neon.tech/neondb/auth/callback/google`).
   - **`kaesava-matters-dev`** already has `http://localhost` and Tailscale configured (only add `http://localhost:<DEV_WEB_PORT>` if client-side Google JS SDK ever rejects bare `http://localhost`).

### Step 2: Inbound & Outbound Email (`info@<subd>.kaesava.au`)
1. **Resend Dashboard → Domains → Add Domain:**
   - Enter `<subd>.kaesava.au` (e.g., `tradiematters.kaesava.au`) and allow Resend's automated Cloudflare DNS setup (Forge infrastructure: `resend._domainkey.<subd>` TXT, `rsend.<subd>` CNAME, `send.<subd>` CNAME — all DNS-only).
   - **Note:** Resend Forge also adds an inbound receiving MX record (`MX <subd>.kaesava.au → receive-apne1.forge.rmta.net`). **Remove that MX record** so Cloudflare Email Routing can own inbound email (Resend *Sending* stays Verified via `send.*`, `rsend.*`, and `resend._domainkey.*`).
   - **DMARC:** Already covered automatically by root `_dmarc.kaesava.au` (Cloudflare DMARC Management inherits to all `*.kaesava.au` subdomains) — no per-subdomain `_dmarc` record needed.
   - In **Resend → API Keys → Create API Key**: name it `<slug>-prod`, Permission: **Sending access**, Domain: `<subd>.kaesava.au` → save as `RESEND_API_KEY`.
2. **Cloudflare Dashboard → `kaesava.au` → Email → Email Routing:**
   - Add Cloudflare Email Routing MX records (`route1/route2/route3.mx.cloudflare.net`, DNS-only) and SPF TXT (`"v=spf1 include:_spf.mx.cloudflare.net include:resend.com ~all"`, DNS-only) for `<subd>.kaesava.au`.
   - **Do NOT add placeholder `AAAA 100::` records** for `<subd>.kaesava.au` or `api.<subd>.kaesava.au` — Wrangler `custom_domain = true` creates and manages its own DNS records + TLS certs and will conflict with pre-existing `AAAA` records.
   - Create Custom Address `info@<subd>.kaesava.au` → forward to your primary inbox, and verify by sending a test email from an external address.

### Step 3: Cloudflare R2 & AI Gateway
1. **Cloudflare Dashboard → R2 Object Storage:**
   - Create bucket `<slug>-production` (Region: Asia-Pacific / `APAC`).
   - Create bucket `<slug>-dev`.
   - Go to **Manage R2 API Tokens → Create API Token**: name `<slug>-r2`, Permission: **Object Read & Write**, Scope: specify `<slug>-production` and `<slug>-dev` → save `STORAGE_ACCESS_KEY_ID` and `STORAGE_SECRET_ACCESS_KEY`.
2. **Cloudflare Dashboard → AI → AI Gateway:**
   - Create gateway `<slug>-ai-prod` (and `<slug>-ai-dev` for local dev).
   - Reuse your existing `CF_ACCOUNT_ID` and `CF_AI_API_TOKEN`.

### Step 4: Stripe Sub-Account & Webhooks
1. **Stripe Dashboard → Account Switcher (top-left) → Create New Account:**
   - Name: `<App Name>` under your existing Kaesava AU business details.
   - Configure **Settings → Branding** (logo, brand color, support email `info@<subd>.kaesava.au`, statement descriptor e.g. `TRADIEMATTERS`).
   - If enabling **Stripe Custom Email Domain** (`<subd>.kaesava.au`) for Stripe receipts/invoices, add the `stripe-verification` TXT and all `_domainkey` / `bounce` CNAMEs in Cloudflare DNS with Proxy set to **DNS only (grey cloud)** — proxying DKIM/bounce CNAMEs breaks verification and deliverability.
2. **Test Mode (Dev) & Live Mode (Prod):**
   - Create Products & Prices: Monthly, Annual (and Founding Annual if enabled). Record `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`, `STRIPE_PRICE_FOUNDING_ANNUAL`.
   - Copy `STRIPE_SECRET_KEY` (`sk_test_...` for dev, `sk_live_...` for prod).
3. **Live Mode → Developers → Webhooks → Add Endpoint:**
   - Endpoint URL: `https://api.<subd>.kaesava.au/webhooks/stripe`
   - Select events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`.
   - Reveal & save Signing Secret → `STRIPE_WEBHOOK_SECRET`.

### Step 5: Sentry, PostHog, GA4 & Search Console
1. **Sentry:** Create 3 projects in your existing org: `<slug>-web` (Next.js), `<slug>-api` (Node/Cloudflare), `<slug>-mobile` (React Native). Record all 3 DSNs and note `SENTRY_ORG`, `SENTRY_PROJECT` (`<slug>-web`), and `SENTRY_AUTH_TOKEN`.
2. **PostHog:** Create a new Project (`<App Name>`). Record the Project API Key/Token (used for `POSTHOG_API_KEY`, `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN`).
3. **Google Analytics 4:** Create a new Property (`<App Name>`) + Web Data Stream (`https://<subd>.kaesava.au`) → record `NEXT_PUBLIC_GA_MEASUREMENT_ID` (`G-...`).
4. **Google Search Console:** Add URL-prefix property `https://<subd>.kaesava.au` → HTML tag verification → record `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.

### Step 6: Mobile (Expo EAS, Firebase FCM, Google Play Console)
1. Inside `apps/<prefix>-mobile`, run `npx eas-cli init` → records `extra.eas.projectId` in `app.json` (also copy this UUID into `AppManifest.easProjectId`).
2. **Firebase Console:** Add Android app `au.kaesava.<subd>` → download `google-services.json` to `apps/<prefix>-mobile/google-services.json` (gitignored if private, or managed via EAS file secret) and upload the Firebase Admin SDK JSON (FCM v1) via `npx eas-cli credentials -p android`.
3. **Google Play Console:** Create app `au.kaesava.<subd>` and attach your Play Console service account key to EAS for automated internal track submissions.

### Step 7: First Cloudflare Deploy & Inngest Sync
1. Push all production secrets to Cloudflare Workers **before** first traffic:
   ```bash
   # Inside apps/<prefix>-api
   for key in DATABASE_URL UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN \
     RESEND_API_KEY INNGEST_EVENT_KEY INNGEST_SIGNING_KEY \
     STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET \
     STORAGE_ACCESS_KEY_ID STORAGE_SECRET_ACCESS_KEY \
     CF_AI_API_TOKEN POSTHOG_API_KEY SENTRY_DSN EXPO_ACCESS_TOKEN; do
     pnpm wrangler secret put "$key"
   done

   # Inside apps/<prefix>-web
   for key in UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN; do
     pnpm wrangler secret put "$key"
   done
   ```
2. Deploy `<slug>-api` and `<slug>-web` (Cloudflare automatically binds `api.<subd>.kaesava.au` and `<subd>.kaesava.au` via `custom_domain = true` with TLS 1.3).
3. Verify `GET https://api.<subd>.kaesava.au/health` returns `200 { "status": "ok" }`.
4. **Inngest Cloud → Apps → Sync New App:** Enter `https://api.<subd>.kaesava.au/api/inngest` and confirm all workflows register under `<slug>-api-service`.

---

## 4. Complete Environment Variable Reference

### 4.1 `apps/<prefix>-api`
- **Local Dev:** `apps/<prefix>-api/.env.development` (and `.dev.vars` for `wrangler dev`) — both gitignored; commit `.env.example`.
- **Prod Non-Secrets:** `apps/<prefix>-api/wrangler.toml` under `[vars]`.
- **Prod Secrets:** `wrangler secret put` (listed in Step 7 above).

| Variable | Local Dev Value | Prod Location |
| :--- | :--- | :--- |
| `<PREFIX>_APP_ID` | Permanent UUIDv7 | `wrangler.toml [vars]` |
| `DEFAULT_APP_ID` | Same UUIDv7 | `wrangler.toml [vars]` |
| `ENVIRONMENT` | `development` (CLI `--var`) | `wrangler.toml [vars]` (`"production"`) |
| `DATABASE_URL` | Dev Neon branch URL | `wrangler secret` (Prod Neon URL) |
| `NEON_AUTH_BASE_URL` | Dev Neon Auth URL | `wrangler.toml [vars]` (Prod Neon Auth URL) |
| `NEON_AUTH_JWKS_URL` | Dev Neon Auth JWKS URL | `wrangler.toml [vars]` (Prod Neon Auth JWKS URL) |
| `UPSTASH_REDIS_REST_URL` | *(blank — in-memory fallback)* | `wrangler secret` (shared Upstash URL) |
| `UPSTASH_REDIS_REST_TOKEN` | *(blank)* | `wrangler secret` (shared Upstash token) |
| `RESEND_API_KEY` | Scoped Resend key | `wrangler secret` |
| `RESEND_FROM_EMAIL` | `<App Name> <info@<subd>.kaesava.au>` | `wrangler.toml [vars]` |
| `INNGEST_EVENT_KEY` | `mock-inngest-event-key` | `wrangler secret` (shared Inngest prod key) |
| `INNGEST_SIGNING_KEY` | `mock-inngest-key` | `wrangler secret` (shared Inngest prod key) |
| `STRIPE_SECRET_KEY` | Sub-account `sk_test_...` | `wrangler secret` (sub-account `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe CLI `whsec_...` | `wrangler secret` (live endpoint `whsec_...`) |
| `STRIPE_PRICE_MONTHLY` | Test `price_...` | `wrangler.toml [vars]` (Live `price_...`) |
| `STRIPE_PRICE_ANNUAL` | Test `price_...` | `wrangler.toml [vars]` (Live `price_...`) |
| `STRIPE_PRICE_FOUNDING_ANNUAL` | Test `price_...` | `wrangler.toml [vars]` (Live `price_...`) |
| `STORAGE_ENDPOINT` | `https://<CF_ACCOUNT_ID>.r2.cloudflarestorage.com` | `wrangler.toml [vars]` |
| `STORAGE_BUCKET_NAME` | `<slug>-dev` | `wrangler.toml [vars]` (`<slug>-production`) |
| `STORAGE_REGION` | `auto` | `wrangler.toml [vars]` |
| `STORAGE_ACCESS_KEY_ID` | Scoped R2 key ID | `wrangler secret` |
| `STORAGE_SECRET_ACCESS_KEY` | Scoped R2 secret | `wrangler secret` |
| `GLOBAL_MAX_FILE_SIZE_MB` | `10` | `wrangler.toml [vars]` |
| `CF_ACCOUNT_ID` | Cloudflare Account ID | `wrangler.toml [vars]` |
| `CF_AI_GATEWAY_ID` | `<slug>-ai-dev` | `wrangler.toml [vars]` (`<slug>-ai-prod`) |
| `CF_AI_API_TOKEN` | Shared CF AI token | `wrangler secret` |
| `AI_MODEL_ID` | `@cf/meta/llama-3.1-8b-instruct` | `wrangler.toml [vars]` |
| `POSTHOG_API_KEY` | *(blank or dev key)* | `wrangler secret` (new PostHog project key) |
| `POSTHOG_HOST` | `https://us.i.posthog.com` | `wrangler.toml [vars]` |
| `SENTRY_DSN` | *(blank)* | `wrangler secret` (`<slug>-api` DSN) |
| `EXPO_ACCESS_TOKEN` | Shared Expo push token | `wrangler secret` |

### 4.2 `apps/<prefix>-web`
- **Local Dev:** `apps/<prefix>-web/.env.development` (gitignored); commit `.env.example`.
- **Prod Build-Time `NEXT_PUBLIC_*`:** Set identically in `apps/<prefix>-web/.env.production` **and** `apps/<prefix>-web/wrangler.jsonc` (`vars`).
- **Prod Runtime Secrets:** `wrangler secret put` (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).
- **Sentry Source Maps:** `apps/<prefix>-web/.env.sentry-build-plugin` (`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT=<slug>-web`).

| Variable | Local Dev Value | Prod Value |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_ID` | Permanent UUIDv7 | Permanent UUIDv7 |
| `NEXT_PUBLIC_API_URL` | `http://localhost:<DEV_API_PORT>` | `https://api.<subd>.kaesava.au` |
| `NEXT_PUBLIC_NEON_AUTH_URL` | Dev Neon Auth URL | Prod Neon Auth URL |
| `NEXT_PUBLIC_ENABLE_AUTH` | `true` | `true` |
| `NEXT_PUBLIC_ENABLE_FOUNDING_OFFER` | `true` / `false` | `true` / `false` |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` | `https://us.i.posthog.com` |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | *(blank)* | New PostHog project token |
| `NEXT_PUBLIC_SENTRY_DSN` | *(blank)* | `<slug>-web` Sentry DSN |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | *(blank)* | New GA4 `G-...` ID |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | *(blank)* | Search Console verification token |
| `UPSTASH_REDIS_REST_URL` | *(blank)* | `wrangler secret` (shared Upstash URL) |
| `UPSTASH_REDIS_REST_TOKEN` | *(blank)* | `wrangler secret` (shared Upstash token) |
| `DEV_NEON_AUTH_ORIGIN` | Optional tunnel URL | *(dev only — omit in prod)* |

### 4.3 `apps/<prefix>-mobile`
- **Local Dev:** `apps/<prefix>-mobile/.env.development`
- **Prod:** `apps/<prefix>-mobile/.env.production` + EAS Environment Variables (`eas env:create`)

| Variable | Local Dev Value | Prod Value |
| :--- | :--- | :--- |
| `EXPO_PUBLIC_APP_ID` | Permanent UUIDv7 | Permanent UUIDv7 |
| `EXPO_PUBLIC_API_URL` | `http://localhost:<DEV_API_PORT>` | `https://api.<subd>.kaesava.au` |
| `EXPO_PUBLIC_AUTH_ORIGIN` | `http://localhost:<DEV_WEB_PORT>` | `https://<subd>.kaesava.au` |
| `EXPO_PUBLIC_NEON_AUTH_URL` | Dev Neon Auth URL | Prod Neon Auth URL |
| `EXPO_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` | `https://us.i.posthog.com` |
| `EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN` | *(blank)* | New PostHog project token |
| `EXPO_PUBLIC_SENTRY_DSN` | *(blank)* | `<slug>-mobile` Sentry DSN |

---

## 5. Exact Monorepo Files to Create & Update

### 5.1 New Files to Scaffold
1. **Ring 3 Domain Capability (`packages/capabilities/<prefix>-<domain>/`):**
   - Register the app manifest via `registerAppManifest(...)` from `@kaesava/config` (reference: `packages/core/src/__tests__/tradie-app-dry-run.test.ts`).
2. **`apps/<prefix>-api/`:**
   - `wrangler.toml` — `name = "<slug>-api"`, `routes = [{ pattern = "api.<subd>.kaesava.au", custom_domain = true }]`, `[dev] port = <DEV_API_PORT>`, `[vars]`.
   - `src/worker.ts` — Use `createPlatformWorker` with `resolveDefaultAppId: (env) => env.<PREFIX>_APP_ID` and `createAppEnvSchema({ <PREFIX>_APP_ID: z.string().uuid().optional() })` (never edit `packages/config/src/env.ts` for app-specific env vars).
   - `src/inngest/client.ts` — `new Inngest({ id: "<slug>-api-service" })` + `syncInngestEventKey()`.
   - `.env.example`, `.env.development` (gitignored), `.dev.vars` (gitignored).
3. **`apps/<prefix>-web/`:**
   - `wrangler.jsonc` — `"name": "<slug>-web"`, `"routes": [{ "pattern": "<subd>.kaesava.au", "custom_domain": true }]`, `"vars"`.
   - `next.config.ts` — Update `Content-Security-Policy` `connect-src` to `https://api.<subd>.kaesava.au`, and ensure `transpilePackages` includes all consumed `@kaesava/*` and `@<slug>/*` packages.
   - `src/app/api/auth/[...auth]/route.ts` & `src/app/api/trpc/[trpc]/route.ts` — Update `allowedOrigins` to `https://<subd>.kaesava.au`, `https://api.<subd>.kaesava.au`, `http://localhost:<DEV_WEB_PORT>`, `http://localhost:<DEV_API_PORT>`, and forward `x-app-id: process.env.NEXT_PUBLIC_APP_ID`.
   - `src/app/globals.css` — Include `@source` directives for `packages/ui` and `packages/capabilities/*`.
   - `.env.example`, `.env.development`, `.env.production`, `.env.sentry-build-plugin`.
4. **`apps/<prefix>-mobile/`:**
   - `app.json` — `name`, `slug: "<slug>"`, `scheme: "<subd>"`, `android.package: "au.kaesava.<subd>"`, `ios.bundleIdentifier: "au.kaesava.<subd>"`, `extra.eas.projectId`.
   - `eas.json`, `google-services.json`, `.env.example`, `.env.development`, `.env.production`.
   - `package.json` — `dev` script must run `adb reverse tcp:<DEV_API_PORT> tcp:<DEV_API_PORT>`.

### 5.2 Existing Monorepo Files to Update
1. **`packages/db/src/rings/<slug>.ts` & `packages/db/package.json`:**
   - Export Ring 3 tables under `"./rings/<slug>"` (`"types"` first in `exports`).
2. **`packages/db/src/seed.ts`:**
   - Idempotently upsert the new app row in `apps` (`id`, `name`, `slug`, `featureFlags`). Run `pnpm seed` (dev) and `pnpm seed:prod` (prod).
3. **Root `package.json`:**
   - Update `dev:inngest` to pass `-u http://127.0.0.1:<DEV_API_PORT>/api/inngest`.
   - Add `"dev:<prefix>"` script running only `@<slug>/web`, `@<slug>/api`, and Inngest so you don't have to boot every app simultaneously.
   - Add `<prefix>:mobile:build:preview`, `<prefix>:mobile:build:prod`, `<prefix>:mobile:build:submit`.
4. **`.github/workflows/deploy.yml`:**
   - Add `deploy-<prefix>-api` (`workingDirectory: apps/<prefix>-api`) and `deploy-<prefix>-web` (`pnpm --filter @<slug>/web cf-build` + `workingDirectory: apps/<prefix>-web`).
5. **Repo Guardrail & Tooling Scripts:**
   - `scripts/check-boundaries.mjs` — Add `@<slug>/capability-*` and `@kaesava/db/rings/<slug>` to `FORBIDDEN_PATTERNS`, and `<PREFIX>_APP_ID` / `<subd>.kaesava.au` to `HARDCODED_BRAND_PATTERNS`.
   - `scripts/check-mobile-interaction.mjs` — Add `'apps/<prefix>-mobile/src'` to `ROOTS`.
   - `scripts/version-bump.mjs` — Add `--target=<slug>` (or support bumping `apps/<prefix>-web` and `apps/<prefix>-mobile`).
6. **Canonical Docs:**
   - Record the new UUID in Section 1 of this skill (`new-app-onboarding/SKILL.md`), and update `SCHEMA_DATA_DICTIONARY.md` for any new Ring 3 tables (`pnpm audit:schema`).

---

## 6. Post-Setup Verification Checklist
- [ ] `GET https://api.<subd>.kaesava.au/health` → `200 OK`
- [ ] Email sent to `info@<subd>.kaesava.au` arrives in your inbox; Resend test email passes SPF/DKIM/DMARC
- [ ] Sign-up & Google OAuth work on both `http://localhost:<DEV_WEB_PORT>` and `https://<subd>.kaesava.au`
- [ ] New tenant auto-provisions with `tenants.app_id === <APP_ID>` and isolated trial in `user_app_trials`
- [ ] Stripe test checkout + webhook updates `tenants.subscription_status` and inserts `billing_invoices`
- [ ] Inngest Cloud shows `<slug>-api-service` synced with green status
- [ ] Sentry receives a test event in `<slug>-web`, `<slug>-api`, and `<slug>-mobile`
- [ ] `pnpm validate:prod` passes with zero boundary, i18n, schema, or mobile-interaction violations
