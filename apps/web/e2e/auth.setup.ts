import fs from 'node:fs';
import path from 'node:path';
import { expect, test as setup } from '@playwright/test';

const authStorageFile = path.join(__dirname, '../test-results/.auth/user.json');

setup('authenticate verified dev account once per suite run', async ({ page }) => {
  const email = process.env.E2E_EMAIL?.trim();
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'E2E_AUTHENTICATED=1 requires E2E_EMAIL and E2E_PASSWORD environment variables (see seed_credentials.local.md).'
    );
  }

  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.stack || err.message));
  page.on('response', (res) => {
    if (res.status() >= 500 || (res.url().includes('/_next/static/') && !res.ok())) {
      pageErrors.push(`HTTP ${res.status()} ${res.url()}`);
    }
  });

  fs.mkdirSync(path.dirname(authStorageFile), { recursive: true });

  // Wait for full JS load + React hydration before filling controlled inputs.
  await page.goto('/sign-in', { waitUntil: 'load', timeout: 45_000 });

  const emailInput = page.locator('#signin-email');
  const passwordInput = page.locator('#signin-password');
  const submitButton = page.locator('button[type="submit"]').first();

  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();

  // Clear before filling inside toPass() so React's _valueTracker always observes a value transition
  // even if the first attempt raced with hydration.
  await expect(async () => {
    if (pageErrors.length > 0) {
      throw new Error(`Client runtime error on /sign-in: ${pageErrors.join(' | ')}`);
    }
    await emailInput.fill('');
    await passwordInput.fill('');
    await emailInput.fill(email);
    await passwordInput.fill(password);
    await expect(emailInput).toHaveValue(email);
    await expect(passwordInput).toHaveValue(password);
    await expect(submitButton).toBeEnabled({ timeout: 2000 });
  }).toPass({ timeout: 25_000 });

  const signInResponsePromise = page.waitForResponse(
    (res) =>
      res.url().includes('/api/auth/sign-in') &&
      res.request().method() === 'POST',
    { timeout: 30_000 }
  );

  await submitButton.click();

  const signInResponse = await signInResponsePromise;
  if (!signInResponse.ok()) {
    const responseBody = await signInResponse.text().catch(() => '');
    const alertText = await page.locator('[role="alert"]').first().textContent().catch(() => '');
    throw new Error(
      `Sign-in HTTP ${signInResponse.status()} for ${email}. ` +
        `Alert: "${alertText?.trim() || 'none'}". Body: ${responseBody.slice(0, 300)}`
    );
  }

  await page.waitForURL(
    (url) => !url.pathname.startsWith('/sign-in') && !url.pathname.startsWith('/auth-callback'),
    { timeout: 45_000, waitUntil: 'domcontentloaded' }
  );

  await expect(page.locator('main').first()).toBeVisible({ timeout: 30_000 });
  await page.context().storageState({ path: authStorageFile });
});
