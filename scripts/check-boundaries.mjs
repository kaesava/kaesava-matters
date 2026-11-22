#!/usr/bin/env node
/**
 * Vertical Slice Architecture Boundary Guardrail (`pnpm check:boundaries`)
 *
 * Ensures Ring 1 (Platform Core & UI) and Ring 2 (App-Agnostic Capabilities) NEVER import
 * Ring 3 (Money Matters domain packages or tables) or hardcode Money Matters identifiers,
 * guaranteeing zero blast radius when adding or modifying app-specific capabilities.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const PROTECTED_PACKAGES = [
  "packages/config/src",
  "packages/core/src",
  "packages/ui/src",
  "packages/types/src",
  "packages/i18n/src",
  "packages/capabilities/tenant/src",
  "packages/capabilities/bank-accounts/src",
  "packages/capabilities/billing/src",
  "packages/capabilities/bug-reports/src",
  "packages/capabilities/file-notes/src",
  "packages/capabilities/notifications/src",
  "packages/capabilities/schedules/src",
  "packages/capabilities/assistant/src",
  "packages/capabilities/transactions/src",
];

const FORBIDDEN_PATTERNS = [
  { label: "@money-matters/capability-budgeting", regex: /@money-matters\/capability-budgeting/ },
  { label: "@money-matters/capability-simulation", regex: /@money-matters\/capability-simulation/ },
  { label: "@money-matters/db/rings/money-matters", regex: /@money-matters\/db\/rings\/money-matters/ },
  {
    label: "cross-Ring-2 capability import",
    regex: /from\s+["']@money-matters\/capability-(tenant|bank-accounts|billing|bug-reports|file-notes|notifications|schedules|assistant|transactions)(\/[^"']*)?["']/,
  },
  {
    label: "@trpc/server inside Ring 1/Ring 2 domain logic",
    regex: /from\s+["']@trpc\/server["']/,
  },
  {
    label: "monolithic root @money-matters/db import (use @money-matters/db/rings/platform or /rings/capabilities)",
    regex: /from\s+["']@money-matters\/db["']/,
  },
  {
    label: "Money Matters budgeting DB tables",
    regex: /import\s*\{[^}]*\b(envelopes|incomeEvents|expenseEvents|allocationPlans|allocationPlanLines|paydayStrategySteps|transactionLedger|getEnvelopeBalancesMap)\b[^}]*\}\s*from\s*["']@money-matters\/db["']/,
  },
];

// Hardcoded Money Matters identifiers are only allowed inside the AppManifest registry itself.
const HARDCODED_BRAND_PATTERNS = [
  { label: "hardcoded MONEY_MATTERS_APP_ID env key", regex: /\bMONEY_MATTERS_APP_ID\b/ },
  { label: "hardcoded moneymatters.kaesava.au domain", regex: /moneymatters\.kaesava\.au/ },
];

const BRAND_CHECK_ALLOWLIST = new Set([
  "packages/config/src/app-registry.ts",
  "packages/config/src/env.ts",
  "packages/core/src/security-headers.ts",
  "packages/i18n/src/dictionaries/en/privacy.ts",
]);

function walkTsFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "__tests__") {
        continue;
      }
      results.push(...walkTsFiles(full));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts") && !entry.name.endsWith(".test.tsx")) {
      results.push(full);
    }
  }
  return results;
}

const violations = [];

for (const relPkg of PROTECTED_PACKAGES) {
  const absDir = path.join(ROOT, relPkg);
  for (const file of walkTsFiles(absDir)) {
    const relPath = path.relative(ROOT, file);
    const content = fs.readFileSync(file, "utf8");
    for (const rule of FORBIDDEN_PATTERNS) {
      if (relPath === "packages/core/src/db-client.ts" && rule.label.startsWith("monolithic root")) {
        continue;
      }
      if (rule.regex.test(content)) {
        violations.push({ file: relPath, rule: rule.label });
      }
    }
    if (!BRAND_CHECK_ALLOWLIST.has(relPath)) {
      for (const rule of HARDCODED_BRAND_PATTERNS) {
        if (rule.regex.test(content)) {
          violations.push({ file: relPath, rule: rule.label });
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error("\n[check:boundaries] Vertical Slice Architecture boundary violations detected:\n");
  for (const v of violations) {
    console.error(`  - ${v.file} -> forbidden: ${v.rule}`);
  }
  console.error("\nCentral platform packages (Ring 1 & Ring 2) must NEVER import app-specific domain packages/tables or hardcode Money Matters identifiers.\n");
  process.exit(1);
}

console.log(`[check:boundaries] Passed (${PROTECTED_PACKAGES.length} platform packages verified, 0 domain leaks).`);
