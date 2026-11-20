---
name: quick-fix
description: Fast, scoped implementation and targeted validation for very small, limited fixes (styling/color tweaks, formatting, single-function bug fixes). Skips full pnpm validate:prod and Next.js web builds, compiling and checking only affected packages.
---

# Quick Fix Protocol

1. **Strict Scope Guardrail (Small Fixes Only):**
   * Use **only** for very small, self-contained fixes (e.g., UI styling/color/formatting tweaks, single-component or single-function bug fixes, script fixes).
   * **Escalate to `/build-feature`** if the change touches Drizzle schemas/migrations, RLS policies, new tRPC procedures, new routes/modals, or multi-package features.
2. **AGENTS.md & Parity Adherence:**
   * Follow `AGENTS.md` invariants (zero `any`, `DESIGN_TOKENS`, `@money-matters/i18n`, file/function size limits).
   * Apply the fix across both Web and Mobile (`packages/ui` or `apps/web` + `apps/mobile`) unless explicitly scoped with `Web:` or `Mobile:`.
3. **Targeted Validation Only (No Full `validate:prod` or Web Build):**
   * Do **not** run `pnpm validate:prod` or `pnpm --filter @money-matters/web build`.
   * Run only targeted checks on the touched packages:
     - `pnpm --filter <pkg> typecheck`
     - `pnpm --filter <pkg> lint`
     - Targeted Vitest run (`pnpm --filter <pkg> test -- <test-file>`) when logic or tests changed
     - `pnpm check-i18n` only if `@money-matters/i18n` keys changed
     - `rm -f apps/mobile/.tsbuildinfo` before mobile typecheck if workspace exports changed
4. **Docs & Git:**
   * Update canonical `.md` registries only if a documented item actually changed.
   * Report changed files and targeted check results concisely. Commit/push only when asked (or follow user instructions).
