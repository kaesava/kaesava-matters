#!/usr/bin/env node
// Enforces the Mobile Interaction invariant (AGENTS.md §5): no underlined navigation text, no tiny text,
// no sub-44dp button-like style definitions. Escape hatch: append `// mm-allow-interaction: <reason>` to the line.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['apps/mobile/src', 'packages/ui/src/mobile', 'packages/capabilities'];
const DECORATIVE_KEY = /badge|chip|pill|tag|footnote|caption|axis|tick/i;
const CHART_KEY = /label|legend|pct|month|subtitle|text/i;
const BUTTONISH_KEY = /btn|button|close|action|toggle|overflow|trigger/i;
const MIN_TOUCH = 44;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === '__tests__') continue;
      yield* walk(full);
    } else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) yield full;
  }
}

const violations = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    let currentKey = '';
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      const keyMatch = line.match(/^\s{2}(\w+):\s*\{/);
      if (keyMatch) currentKey = keyMatch[1];
      if (line.includes('mm-allow-interaction')) return;
      const at = `${file}:${i + 1}`;
      if (/textDecorationLine:\s*['"]underline['"]/.test(line)) {
        violations.push(`${at} underlined text; use MobileLinkButton / MobileDetailLinkRow`);
      }
      if ((file.startsWith('apps/mobile/src') || file.startsWith('packages/capabilities')) && /<Switch\b/.test(line)) {
        violations.push(`${at} raw <Switch>; use centralized SwitchRow from @kaesava/ui/mobile`);
      }
      if ((file.startsWith('apps/mobile/src') || file.startsWith('packages/capabilities')) && /<TextInput\b/.test(line)) {
        violations.push(`${at} raw <TextInput>; use centralized MobileInput or AmountInput from @kaesava/ui/mobile`);
      }
      const size = line.match(/fontSize:\s*(\d+(?:\.\d+)?)/);
      if (size) {
        const n = Number(size[1]);
        if (n < 11 || (n < 12 && !(DECORATIVE_KEY.test(currentKey) || (file.includes('/charts/') && CHART_KEY.test(currentKey))))) {
          violations.push(`${at} fontSize ${n} in "${currentKey}" is below the 12sp floor`);
        }
      }
      const dim = line.match(/^\s{4}(?:width|height|minHeight|minWidth):\s*(\d+)\s*,?\s*$/);
      if (dim && BUTTONISH_KEY.test(currentKey) && Number(dim[1]) < MIN_TOUCH && !/minHeight|minWidth/.test(line)) {
        violations.push(`${at} "${currentKey}" is ${dim[1]}dp; touch targets must be >= ${MIN_TOUCH}dp`);
      }
    });
  }
}

if (violations.length > 0) {
  console.error(`Mobile interaction check failed (${violations.length}):\n${violations.join('\n')}`);
  process.exit(1);
}
console.log('Mobile interaction check passed.');
