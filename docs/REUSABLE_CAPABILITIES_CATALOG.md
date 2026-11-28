# Reusable Capabilities Catalog (`~/projects/{template,tradie,team-manager}`)

> **Purpose:** Permanent architectural reference catalog of reusable Ring 1 primitives, Ring 2 capabilities, and Ring 3 domain slices audited from sibling Kaesava repositories (`template`, `tradie`, `team-manager`).  
> **Governance:** Per `AGENTS.md` (**Rule of Two** & **Dogfood or Delete**), nothing in this catalog is ported until a live product genuinely needs it. All Ring 3 Tradie Matters capabilities remain parked until Tradie Matters' functional design is finalized.  
> **Mandatory Porting Rule:** Every ported capability MUST be rewritten to 100% `kaesava-matters` compliance: 4-subpath standard (`.`, `./router`, `./web`, `./mobile` with `"types"` first), `tenantId` + `appId` + RLS + audit columns + soft deletes, Zod `.strict()`, zero `any`, `@kaesava/ui` + `DESIGN_TOKENS` + `@kaesava/i18n`, Web + Mobile parity, and Vitest coverage.

---

## 1. Critical Source Defects to Fix When Porting

Never copy-paste source files verbatim. Audit and fix these known defects in the source repos:

1. **Broken In-Memory Geo Cache (`template/packages/capabilities/geo`):** `PLACE_CACHE` uses a Node process `Map` — ineffective and unsafe on stateless Cloudflare Workers. Replace with a stateless single-call OSM Photon proxy (or Upstash Redis if caching is needed).
2. **Deleted Chat Schema (`template/packages/capabilities/chat`):** Chat DB tables were removed during `template`'s BookFlow pivot; only domain/UI patterns remain. Author fresh Drizzle tables with `tenantId`, `appId`, RLS, and soft deletes.
3. **Hardcoded Styling & Raw Primitives (`template`, `tradie`):** Source UI uses hardcoded `indigo-600`/`indigo-650`, raw `<input>`/`<button>`/`confirm()`, and hardcoded English fallbacks (`defaultValue: '...'`). Replace with `@kaesava/ui` primitives, `DESIGN_TOKENS`, and `@kaesava/i18n` keys.
4. **Hardcoded Regional Defaults (`tradie`, `template`):** Hardcoded `$`, `AUD`, `en-AU`, and `Australia/Sydney` appear in source views. Route all formatting through `useCurrencyLocale()`, `useLocale()`, and `fmtDate` / `fmtDateMedium`.
5. **Missing RLS & Soft Deletes (`tradie`, `team-manager`):** Source tables lack PostgreSQL RLS policies, `appId`, and `archivedAt` soft-delete guards.
6. **File/Function Size Overruns:** Several source components exceed 400 lines (e.g., `GenericListView.tsx`, calendar views). Decompose into headless logic + thin Web/Mobile views (files ≤ 400 lines, functions ≤ 30 lines, components ≤ 100 lines).

---

## 2. Deferred & Ported Ring 1 Primitives

| Primitive | Target Package | Source Reference | Status / Trigger | Compliance Notes |
| :--- | :--- | :--- | :--- | :--- |
| **`zonedTimeToUtc()` & `utcToZonedTime()`** | `@kaesava/core` (`intl-calendar.ts`) | `template/packages/core/src/timezone.ts` | **Implemented / Ported** | Pure native `Intl.DateTimeFormat`, 0 deps, DST-safe iterative convergence. |
| **`edge-context-factory` & `trpc-factory`** | `@kaesava/core` (`trpc/`, `worker-factory.ts`) | Platform refactor | **Implemented / Ported** | Shared Cloudflare Worker & tRPC edge context factories consumed by both Money Matters & Tradie Matters APIs. |
| **`pdf` & `portal-tokens`** | `@kaesava/core` (`pdf/`, `portal-tokens.ts`) | Tradie Matters V1 | **Implemented / Ported** | Stateless PDF generator & SHA-256 portal token hashing/verification. |
| **`offline` outbox & draft store** | `@kaesava/mobile-core` (`offline/`) | Tradie Matters V1 | **Implemented / Ported** | SQLite-backed offline mutation outbox & draft persistence (`OutboxSyncWrapper`, `OfflineSyncBadge`). |
| **`StatusWorkflowConfig` + `canTransition()` / `getNextStatuses()`** | `@kaesava/types/platform` | `template/packages/capabilities/status/src/{types,utils}.ts` | Deferred (Trigger: 5+ shared stage pipelines) | Replace hardcoded Tailwind/hex colors with semantic tone tokens and `labelKey` i18n keys; zero `any`. |
| **`DetailDrawer` / `MobileDetailSheet`** | `@kaesava/ui/{web,mobile}` | `template/packages/ui/src/web/GenericDetailDrawer.tsx` | **Implemented / Ported** | Wraps `SlideOverDrawer` (Web) and `MobileModalDialog` (Mobile) + `Button`/`MobileButton`. |
| **`ContactLinks` (`EmailLink`, `PhoneLink`, `AddressLink`)** | `@kaesava/ui/{web,mobile}` | `template/packages/ui/src/web/ContactLinks.tsx` | **Implemented / Ported** | Mobile uses `MobileLinkButton` / `MobileDetailLinkRow` (≥ 44dp, no underlined links). |
| **ATO 11-digit Mod-89 ABN Validator + `AbnInput` / `MobileAbnInput`** | `@kaesava/types/platform` & `@kaesava/ui` | `template/packages/ui/src/mobile/fields/SmartAbnInput.tsx` | **Implemented / Ported** | Pure Mod-89 validator in `@kaesava/types`; thin Web/Mobile masked inputs. |
| **`GenericListView`** | `@kaesava/ui/web` | `template/packages/ui/src/web/GenericListView.tsx` | **Implemented / Ported** | Composes `SearchInput`, `PaginationBar`, `SkeletonTable`, `SortHeader`; zero `localStorage` SSR mismatch. |

---

## 3. Ported & Deferred Ring 2 Capabilities (4-Subpath Standard: `.`, `./router`, `./web`, `./mobile`)

| Capability | DB Tables | Source Reference | Status / Key Reusable Patterns | Porting & Compliance Notes |
| :--- | :---: | :--- | :--- | :--- |
| **`@kaesava/capability-calendar`** | 0 (pure view/layout engine) | `tradie/apps/web/src/app/components/calendar/*` + `template` `CalendarTimeline` & `AgendaListView` | **Implemented / Ported** | O(n log n) `layoutDay()` overlap solver; Day/Week/Agenda views; `ResourceDayTimeline`, `ResourceWeekGrid`, `MobileDailyAgendaList`, `MobileWeekStrip`. |
| **`@kaesava/capability-chat`** | 4 (`chat_rooms`, `chat_members`, `chat_messages`, `chat_reads`) | `template/packages/capabilities/chat/*` | **Implemented / Ported** | Fresh Drizzle tables with `tenantId`, `appId`, RLS, audit columns, soft deletes; `@mention` push hook; `ChatThreadPanel` & `MobileChatThreadSheet`. |
| **`@kaesava/capability-geo`** | 0 | `template/packages/capabilities/geo/*` + `SmartAddressInput` | **Implemented / Ported** | Stateless OSM Photon proxy (`searchAddresses`), 2.5s manual-entry fallback, `SmartAddressField` & `MobileSmartAddressField`. |
| **`@kaesava/capability-file-notes` (`isAutoGenerated` flag)** | Existing table | `template` auto-generated PDF attachment pattern | **Implemented / Ported** | `isAutoGenerated` boolean column distinguishing system-generated PDFs/MMS attachments from user uploads. |
| **`@kaesava/capability-tenant` (UI/router) & `@kaesava/capability-billing` (UI)** | Existing tables | Platform refactor | **Implemented / Ported** | Reusable `./router`, `./web`, and `./mobile` subpaths wired into both Money Matters and Tradie Matters. |

---

## 4. Deferred Ring 3 Domain Candidates (Parked Until Tradie Matters Functional Design)

Do **not** pull any of these across until Tradie Matters' functional specification is locked in:

| Domain Slice | Source Reference | Reusable Domain Concepts |
| :--- | :--- | :--- |
| **Customers / CRM** | `template` & `tradie` (`customers`) | Customer directory, contact details, service sites/addresses, notes/history, search & archive. |
| **Service & Parts Catalog** | `template` & `tradie` (`catalog`, `items`) | Priced services/materials, unit types, GST/tax flags, reusable line-item templates. |
| **Quotes / Estimates** | `tradie` (`quotes`) | Draft → Sent → Accepted/Declined workflow, line items, subtotal/GST/total math, convert-to-job. |
| **Jobs / Work Orders** | `tradie` (`jobs`) | Multi-stage job pipeline, staff assignment, scheduled time slots, checklist/notes, photos via `file-notes`. |
| **Invoices & Payments** | `tradie` (`invoices`) | Quote/Job → Invoice conversion, sequential numbering, due dates, partial/full payment tracking, Stripe payment links. |
| **Bookings & Appointments** | `template` (BookFlow `bookings`) | Public/internal slot availability, duration rules, staff assignment, confirmation/cancellation flows. |
| **External Storefront / Catalog Portal** | `template` (`store`, `orders`) | Public tenant slug storefront, cart/order intake, customer portal views. |

---

## 5. Do NOT Port (Already Superior in `kaesava-matters`)

- **`auth`, `tenant`, `billing`, `notifications`, `file-notes`, `schedules`, `bug-reports`, `assistant`, `bank-accounts`:** Already built to production Ring 2 standards with RLS, stealth privacy, multi-app `appId` scoping, and full Web/Mobile parity in `kaesava-matters`.
- **RBAC (`defineAppRolePolicy()`):** `@kaesava/core/guards/rbac.ts` is strictly superior to source ad-hoc role checks.
- **Core UI Primitives:** `ModalDialog`, `SlideOverDrawer`, `ConfirmDialog`, `TypedConfirmDialog`, `PaginationBar`, `SearchInput`, `AmountField`, `DatePickerField`, `PhoneInput`, `CommandPaletteModal`, `PlatformSettingsShell`, and all Mobile equivalents are already stronger in `@kaesava/ui`.
