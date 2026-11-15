---
name: build-feature
description: End-to-end implementation, Web/Mobile parity enforcement, aggressive dead-code culling, full validation (`pnpm validate:prod`), doc sync, and local Git commit. Do NOT use for Q&A or standalone commits.
---

# Feature Execution & Validation Protocol

1. **Strict Adherence, Registry Lookup First & No Walkthroughs:**
   * Follow `AGENTS.md` and the approved implementation plan strictly.
   * Consult `FUNCTIONAL_CAPABILITIES_INVENTORY.md`, `TECHNICAL_SPEC.md` (`§9–§10`), and `SCHEMA_DATA_DICTIONARY.md` first to locate routes, modals, UI primitives, tRPC procedures, and DB tables without redundant repo-wide scans.
   * Do **not** output a walkthrough or fancy summary report when finished. State only the final validation status and commit hash.
2. **Full Web & Mobile Parity:**
   * Implement every feature, change, or fix across **both Web and Mobile** unless explicitly prefixed with `Web:` or `Mobile:`. Share logic in `packages/*` while keeping native UI primitives (`@money-matters/ui/web` and `@money-matters/ui/mobile`).
3. **i18n & Aggressive Cleanup:**
   * Reuse existing `en.ts` keys for like-for-like UI literals (titles, labels, tooltips, placeholders, errors, toasts) across Web and Mobile. Rationalise duplicates.
   * Aggressively delete unused code, unused `en.ts` keys, orphaned files, and dead DB tables/fields (`SCHEMA_DATA_DICTIONARY.md` must stay 100% synced).
4. **Mandatory Post-Build Artifact & Inventory Synchronization (Zero Redundancy):**
   * Before running final validation, update **only** the single authoritative registry that owns each changed artifact (never duplicate across files):
     - **`FUNCTIONAL_CAPABILITIES_INVENTORY.md`**: Update if any Web route (`§2`), Mobile route (`§3`), Modal/Drawer/Confirm Dialog (`§4`), Screen-by-Screen Parity row (`§5`), `@money-matters/ui` export (`§6`), or `@money-matters/i18n` dictionary file/key count (`§7`) was added, modified, or removed.
     - **`TECHNICAL_SPEC.md`**: Update if any tRPC router/procedure (`§9`), HTTP/webhook endpoint (`§10.1`), Inngest workflow (`§10.2`), feature flag (`§10.3`), or infrastructure component (`§1–§8`) changed.
     - **`SCHEMA_DATA_DICTIONARY.md`**: Update the Master Table/RLS/Consumer Registry and per-table column tables if any Drizzle schema, migration, RLS policy, or table consumer changed (`pnpm audit:schema`).
     - **`FUNCTIONAL_SPEC.md`**: Update if domain math, waterfall rules, projection logic, simulation verdicts, or test matrices changed.
     - **`README.md`**: Update only if top-level workspace topology or CLI scripts changed.
5. **In-Flight Checks & Production Gate:**
   * Run targeted checks (`pnpm check-i18n`, `pnpm typecheck`, `pnpm lint`, `pnpm test:affected`, `pnpm test:coverage:affected`) as you build. Clear `apps/mobile/.tsbuildinfo` if workspace exports changed.
   * Whenever Web routes, tabs, form fields, modals, or primary CTAs change, inspect `apps/web/e2e/*.spec.ts` against live components and `@money-matters/i18n` keys (following the `playwright-e2e` skill) and verify registration with `pnpm --filter @money-matters/web exec playwright test --list`.
   * Before finishing, run **`pnpm validate:prod`** and fix any failures iteratively until it exits `0`. (If `next/font/google` fails inside a network-restricted sandbox during `@money-matters/web build`, run `pnpm validate` and `@money-matters/api` build sandboxed first, and isolate `pnpm --filter @money-matters/web build`. If an interrupted Next.js build leaves a stale lock or type cache, remove `apps/web/.next/lock` or `apps/web/.next` before retrying.)
   * **Concurrent-Agent / Dirty Working Tree Hygiene:** If unrelated files are actively changing in the working tree (e.g., another agent running in parallel), do **not** revert or fix unrelated validation failures (`check-i18n`, etc.). Scope in-flight checks to your touched packages (`turbo run ... --filter=...`) and wait for user confirmation before running full `pnpm validate:prod` or committing.
   * Whenever deleting a route, component, or tRPC procedure, update the owning registry table and summary counts in `FUNCTIONAL_CAPABILITIES_INVENTORY.md`, `TECHNICAL_SPEC.md`, and `README.md` before final validation.
6. **Git Commit Protocol:**
   * Once `pnpm validate:prod` passes, stage and commit all changes locally with a conventional commit message (`feat:`, `fix:`, `refactor:`).
   * **STOP and ask the user before running `git push`.**

