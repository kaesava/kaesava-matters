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
  "packages/mobile-core/src",
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
  "packages/capabilities/auth/src",
];

const FORBIDDEN_PATTERNS = [
  { label: "@money-matters/* Ring 3 package", regex: /@money-matters\/capability-(budgeting|simulation)/ },
  { label: "@tradie-matters/* Ring 3 package", regex: /@tradie-matters\// },
  { label: "@kaesava/db/rings/<app> Ring 3 schema", regex: /@(kaesava|money-matters|tradie-matters)\/db\/rings\/(money-matters|tradie-matters)/ },
  {
    label: "cross-Ring-2 capability import",
    regex: /from\s+["']@(kaesava|money-matters)\/capability-(tenant|bank-accounts|billing|bug-reports|file-notes|notifications|schedules|assistant|auth)(\/[^"']*)?["']/,
  },
  {
    label: "@trpc/server inside Ring 1/Ring 2 domain logic",
    regex: /from\s+["']@trpc\/server["']/,
  },
  {
    label: "monolithic root @kaesava/db import (use @kaesava/db/rings/platform or /rings/capabilities)",
    regex: /from\s+["']@(kaesava|money-matters)\/db["']/,
  },
  {
    label: "Money Matters budgeting DB tables",
    regex: /import\s*\{[^}]*\b(envelopes|incomeEvents|expenseEvents|allocationPlans|allocationPlanLines|paydayStrategySteps|transactionLedger|getEnvelopeBalancesMap)\b[^}]*\}\s*from\s*["']@(kaesava|money-matters)\/db["']/,
  },
];

// Hardcoded product identifiers are only allowed inside the AppManifest registry itself.
const HARDCODED_BRAND_PATTERNS = [
  { label: "hardcoded MONEY_MATTERS_APP_ID env key", regex: /\bMONEY_MATTERS_APP_ID\b/ },
  { label: "hardcoded TRADIE_MATTERS_APP_ID env key", regex: /\bTRADIE_MATTERS_APP_ID\b/ },
  { label: "hardcoded Money Matters UUID", regex: /01908bde-34bb-7b19-a178-574211bc93aa/ },
  { label: "hardcoded Tradie Matters UUID", regex: /5cb11fa2-7faf-49d3-9e3a-01f14d2a7b99/ },
  { label: "hardcoded moneymatters.kaesava.au domain", regex: /moneymatters\.kaesava\.au/ },
  { label: "hardcoded tradiematters.kaesava.au domain", regex: /tradiematters\.kaesava\.au/ },
];

const BRAND_CHECK_ALLOWLIST = new Set([
  "packages/config/src/app-registry.ts",
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
      if (
        rule.label.startsWith("@trpc/server") &&
        (relPath.startsWith("packages/core/src/trpc/") || relPath.includes("/src/router/"))
      ) {
        continue;
      }
      if (rule.label === "cross-Ring-2 capability import" && relPkg.startsWith("packages/capabilities/")) {
        const selfCap = relPkg.split("/")[2];
        const match = content.match(rule.regex);
        if (match && match[2] === selfCap) {
          continue;
        }
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

// Ring 2 4-Subpath Contract Check (., ./router, ./web, ./mobile with "types" first)
const RING2_CAPS = [
  "assistant",
  "auth",
  "bank-accounts",
  "billing",
  "bug-reports",
  "file-notes",
  "notifications",
  "schedules",
  "tenant",
];
for (const cap of RING2_CAPS) {
  const pkgPath = path.join(ROOT, "packages/capabilities", cap, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  for (const sub of [".", "./router", "./web", "./mobile"]) {
    const exp = pkg.exports?.[sub];
    if (!exp || Object.keys(exp)[0] !== "types") {
      console.error(`[check:boundaries] Ring 2 capability "${cap}" missing "${sub}" export with "types" first.`);
      process.exit(1);
    }
  }
}

// Cross-Product App Isolation Check (apps/<product-A> must never import @<product-B>/*)
const PRODUCT_ISOLATION_RULES = [
  { dir: "apps/money-matters", forbidden: /@tradie-matters\//, label: "@tradie-matters/* inside apps/money-matters" },
  { dir: "apps/tradie-matters", forbidden: /@money-matters\//, label: "@money-matters/* inside apps/tradie-matters" },
];
for (const rule of PRODUCT_ISOLATION_RULES) {
  for (const file of walkTsFiles(path.join(ROOT, rule.dir))) {
    const content = fs.readFileSync(file, "utf8");
    if (rule.forbidden.test(content)) {
      console.error(`[check:boundaries] Cross-product violation in ${path.relative(ROOT, file)}: ${rule.label}`);
      process.exit(1);
    }
  }
}

console.log(`[check:boundaries] Passed (${PROTECTED_PACKAGES.length} platform packages + ${RING2_CAPS.length} Ring 2 4-subpath contracts + cross-product isolation verified, 0 domain leaks).`);
