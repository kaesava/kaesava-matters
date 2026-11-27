# Money Matters — Production Monorepo Platform

Money Matters is an active, forward-looking household money management platform for Australian and international households. It replaces spreadsheets with a self-healing 5-step waterfall allocation engine, a single pooled Everyday spending balance, 1-click bank balance alignment, multi-currency household governance, decoupled user display locales & timezones, and partner collaboration.

---

## 🏗️ Monorepo Topology

```
money-matters/
├── apps/
│   ├── api/           # Fastify API on Cloudflare Workers (`api.moneymatters.kaesava.au`)
│   ├── mobile/        # Expo React Native app (Android target)
│   └── web/           # Next.js App Router on Cloudflare Workers (`moneymatters.kaesava.au`)
├── packages/
│   ├── capabilities/  # Decoupled vertical slice business logic (9 Ring 2 reusable + 2 Ring 3 app-specific)
│   │   ├── assistant/       # Ring 2: AI Assistant engine (Cloudflare Workers AI Gateway, deterministic matcher, usage quota)
│   │   ├── bank-accounts/   # Ring 2: Bank account CRUD, expected balance & balance sync via BankAccountLifecycleHooks
│   │   ├── billing/         # Ring 2: Subscription state machine, Stripe checkout & portal, multi-app webhook processor
│   │   ├── budgeting/       # Ring 3: 5-step waterfall allocation engine, Money Matters envelope ledger, transfer events & analytics
│   │   ├── bug-reports/     # Ring 2: In-app Beta bug report persistence & diagnostic metadata capture
│   │   ├── file-notes/      # Ring 2: Notes & attachments metadata & privacy resolvers (S3/R2 transport in `@kaesava/core`)
│   │   ├── notifications/   # Ring 2: Expo push, timezone-aware Inngest cron factory & retention jobs
│   │   ├── schedules/       # Ring 2: Generic RRULE recurrence burst & Outlook-style series edit planner (`ScheduleStoreAdapter`)
│   │   ├── simulation/      # Ring 3: Stateless "Can I Afford It?" simulation query engine & goal delay impact calculator
│   │   ├── tenant/          # Ring 2: Tenant creation, partner invite, member removal, composable `DataExportContributor[]` CSV backup
│   │   └── transactions/    # Ring 2: Generic domain-agnostic immutable ledger (`GenericLedgerStoreAdapter`)
│   ├── config/        # Validated Zod environment configurations, fail-closed `AppManifest` registry & feature flags
│   ├── core/          # Server infra (universal logger, rate limiter, auth context, S3/R2 storage transport, Next.js edge proxy helpers)
│   ├── db/            # Drizzle PostgreSQL schemas (22 audited tables, ring-scoped subpaths `./rings/platform`, `./rings/capabilities`, `./rings/money-matters`), migrations, seeds, RLS
│   ├── i18n/          # Centralized localization dictionary & t() / createAppI18n() helpers
│   ├── types/         # Pure domain contracts & Zod DTOs (plus `./platform` ring-pure subpath)
│   └── ui/            # Serene Finance UI primitives, `PlatformSettingsShell`, `AppThemeProvider`, Ask Penny palette & sheets, CountrySelect & design tokens
```

---

## 🚀 Quick Start & Local Development

### Prerequisites
- Node.js (≥20.0.0)
- pnpm (9.0.0)

### Setup Environment
```bash
# Clone the repository
git clone https://github.com/kaesava/money-matters.git
cd money-matters

# Install all workspace dependencies
pnpm install

# Build all packages & apps
pnpm build

# Run i18n parity check
pnpm check-i18n

# Run typechecks across all 16 monorepo packages
pnpm typecheck

# Run Vitest unit tests
pnpm test

# Run only tests affected by uncommitted changes (file-level)
pnpm test:affected

# Run coverage only on affected packages
pnpm test:coverage:affected

# Run automated version bump CLI (major | minor | patch | beta)
pnpm version:bump --type=patch --app=all

# Apply pending database migrations (development / production)
pnpm db:migrate
pnpm db:migrate:prod
```

### Running Local Development Servers
```bash
# Start Web App (Next.js)
pnpm --filter @money-matters/web dev

# Start API Server (Fastify)
pnpm --filter @money-matters/api dev

# Start Mobile App (Expo Metro bundler)
pnpm --filter @money-matters/mobile dev
```

---

## 🌐 Cloudflare Workers Deployment

Both Web and API apps run on **Cloudflare Workers** using `nodejs_compat`:

```bash
# Deploy Web App to Cloudflare Workers via OpenNext
cd apps/web && pnpm cf-deploy

# Deploy API Server to Cloudflare Workers via Wrangler
cd apps/api && pnpm cf-deploy
```

---

## 🛡️ Production Security & Architecture Guidelines
- **Multi-Tenancy**: All data isolated by `tenantId` with PostgreSQL Row Level Security (RLS).
- **Zero Hardcoded Text**: 100% of user-facing UI labels are localized via `@kaesava/i18n` with English (`en.ts`) completeness and externalization enforced by `check-i18n` (Japanese `ja.ts` archived for Release 2).
- **100% Test Coverage**: Comprehensive Vitest unit test suites covering all capabilities, infra modules, and UI components.
- **Zero Hardcoded Styles**: UI components consume centralized Serene Finance design tokens (`#2563eb`, `#1B2B4B`, `#F7F8FA`, `#22c55e`, `#ba1a1a`) from `@kaesava/ui`.
- **Zero PII Logging**: Sensitive fields (emails, passwords, tokens) are automatically redacted in `@kaesava/core` logger.
- **Production Telemetry**: Integrated with PostHog (Self-driving) for product analytics, session replays, and custom funnel events, and Sentry for deep error symbolication. Both are strictly gated to execute only in production builds (`NODE_ENV === "production"` and `!__DEV__`).

---

## 📜 Canonical Documentation & Agent Inventories (MECE — Zero Redundancy)
- [AGENTS.md](file:///home/kaesava/projects/money-matters/AGENTS.md) — Binding architectural invariants, priority order, coding standards, and post-build documentation sync rules.
- [FUNCTIONAL_CAPABILITIES_INVENTORY.md](file:///home/kaesava/projects/money-matters/FUNCTIONAL_CAPABILITIES_INVENTORY.md) — **UI, Route, Modal, Parity & i18n Registry:** Complete inventory of all 36 Web routes, 37 Mobile routes, 56 Modals/Drawers/Confirm Dialogs, Screen-by-Screen Web/Mobile Parity Matrix, `@kaesava/ui` exports, and `@kaesava/i18n` dictionary namespaces.
- [TECHNICAL_SPEC.md](file:///home/kaesava/projects/money-matters/TECHNICAL_SPEC.md) — **Architecture, API & Workflows Registry:** Stack, security/RLS architecture, complete 12-router / 101-procedure tRPC registry (`§9`), HTTP/webhook endpoints, Inngest workflows, and feature flags (`§10`).
- [SCHEMA_DATA_DICTIONARY.md](file:///home/kaesava/projects/money-matters/SCHEMA_DATA_DICTIONARY.md) — **Database & RLS Registry:** Master 22-table RLS policy (`ENABLE`/`FORCE`), session variable, and code consumer registry + column-level data dictionary (`pnpm audit:schema`).
- [FUNCTIONAL_SPEC.md](file:///home/kaesava/projects/kaesava-matters/FUNCTIONAL_SPEC.md) — **Domain Math & Product Rules:** Two-Horizon Waterfall math, 12-Month Cumulative Projection rules, "Can I Afford It?" simulation verdicts, onboarding estimation formulas, and test matrix specifications.
- [V2_SCOPE.md](file:///home/kaesava/projects/kaesava-matters/V2_SCOPE.md) — Deferred Release 2 feature scope.
- [docs/SECURITY_RUNBOOK.md](file:///home/kaesava/projects/kaesava-matters/docs/SECURITY_RUNBOOK.md) — Credential rotation, Cloudflare WAF, and `.githooks/` guardrails (`ALLOW_PROD_PUSH=true git push` for `main`).
- [docs/REUSABLE_CAPABILITIES_CATALOG.md](file:///home/kaesava/projects/kaesava-matters/docs/REUSABLE_CAPABILITIES_CATALOG.md) — Permanent reference catalog of reusable Ring 1, Ring 2 (Calendar, Chat, Geo), and Ring 3 capabilities audited from sibling repos (`~/projects/{template,tradie,team-manager}`) with `AGENTS.md` compliance porting checklists.
