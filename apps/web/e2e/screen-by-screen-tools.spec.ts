import { test, expect } from '@playwright/test';

/**
 * Authenticated Simulation Tools, Reports & Subscription Flows E2E Suite
 */
test.describe('11. Standalone Can I Afford It? Simulator (`/dashboard/afford-check`)', () => {
  test('11.1 One-Off & Ongoing Frequency Simulation Audit', async ({ page }) => {
    await page.goto('/dashboard/afford-check');

    await expect(page.getByRole('heading', { level: 1, name: /Can I Afford/i }).first()).toBeVisible();
    const amountInput = page.locator('input[inputmode="decimal"]').first();
    await expect(amountInput).toBeVisible();
    await amountInput.fill('250.00');

    const ongoingBtn = page.getByRole('button', { name: 'Ongoing', exact: true }).first();
    await expect(ongoingBtn).toBeVisible();
    await ongoingBtn.click();

    await expect(page.getByRole('button', { name: 'Monthly', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fortnightly', exact: true }).first()).toBeVisible();
  });
});

test.describe('12. Reports & Spending Analytics (`/dashboard/reports`)', () => {
  test('12.1 Reports Tabs & Filters Audit', async ({ page }) => {
    await page.goto('/dashboard/reports');

    await expect(page.getByRole('heading', { level: 1, name: /^Reports$/i }).first()).toBeVisible();
    const spendingTab = page.getByRole('button', { name: 'Spending & Cash Flow' }).first();
    const paydayTab = page.getByRole('button', { name: 'Payday Plans' }).first();

    await expect(spendingTab).toBeVisible();
    await expect(paydayTab).toBeVisible();
    await expect(page.getByRole('button', { name: 'Expenses Only' }).first()).toBeVisible();

    await paydayTab.click();
    await expect(page.locator('select').first()).toBeVisible();
  });
});

test.describe('13. Subscription & Billing Flows (`/subscription/*`)', () => {
  test('13.1 Subscription Upgrade Plan Selector (`/subscription/upgrade`)', async ({ page }) => {
    await page.goto('/subscription/upgrade');

    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.locator('main, div').filter({ hasText: /Household/i }).first()).toBeVisible();
  });

  test('13.2 Subscription Manage & Success Pages (`/subscription/manage`, `/subscription/success`)', async ({
    page,
  }) => {
    await page.goto('/subscription/manage', { waitUntil: 'domcontentloaded' });
    await expect(async () => {
      const redirectedToStripe = /billing\.stripe\.com|stripe\.com/.test(page.url());
      if (!redirectedToStripe) {
        await expect(
          page.getByText(/Opening Stripe Billing Portal|Failed to load subscription settings/i).first()
        ).toBeVisible({ timeout: 2000 });
      }
    }).toPass({ timeout: 15_000 });

    await page.goto('/subscription/success', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 5000 });
  });
});
