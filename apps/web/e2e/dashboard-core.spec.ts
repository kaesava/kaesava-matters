import { test, expect } from '@playwright/test';

/**
 * Authenticated Setup Wizard & Main Dashboard Core E2E Suite
 */
test.describe('4. Setup & Recalibration Wizard (`/setup`, `/setup?mode=rerun`)', () => {
  test('4.1 Setup Route Renders Step 1 Income Fields for Completed or New Account (`/setup`)', async ({ page }) => {
    await page.goto('/setup');

    const nameInput = page.locator('input[placeholder*="Salary"]').first();
    const amountInput = page.locator('input[inputmode="decimal"]').first();
    const addIncomeBtn = page.getByRole('button', { name: /Add Income Schedule/i }).first();
    const nextBtn = page.getByRole('button', { name: /Next/i }).first();

    await expect(nameInput).toBeVisible();
    await expect(amountInput).toBeVisible();
    await expect(addIncomeBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();
  });

  test('4.2 Re-calibration Flow Header & Step Counter (`/setup?mode=rerun`)', async ({ page }) => {
    await page.goto('/setup?mode=rerun');

    await expect(page.getByText('Update Household Budget').first()).toBeVisible();
    await expect(page.getByText(/Step 1 of 3/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Cancel/i }).first()).toBeVisible();
  });
});

test.describe('5. Main Dashboard Controls, Navigation, Sync Balance & Shortcuts (`/dashboard`)', () => {
  test('5.1 Dashboard Core Panels & Sidebar Navigation Links', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.locator('[data-tour="envelopes-row"]')).toBeVisible();
    await expect(page.getByText('Everyday Envelope').first()).toBeVisible();
    await expect(page.getByText('Bills Envelope').first()).toBeVisible();
    await expect(page.getByText('Goals').first()).toBeVisible();
    await expect(page.getByText('Upcoming Income').first()).toBeVisible();

    const sidebarNav = page.locator('aside nav').first();
    await expect(sidebarNav.locator('a[href="/dashboard"]').first()).toBeVisible();
    await expect(sidebarNav.locator('a[href="/dashboard/plan"]').first()).toBeVisible();
    await expect(sidebarNav.locator('a[href="/dashboard/bank-accounts"]').first()).toBeVisible();
    await expect(sidebarNav.locator('a[href="/dashboard/envelopes"]').first()).toBeVisible();
    await expect(sidebarNav.locator('a[href="/dashboard/history"]').first()).toBeVisible();
    await expect(sidebarNav.locator('a[href="/dashboard/settings"]').first()).toBeVisible();
  });

  test('5.2 Dashboard Everyday Card `Sync Balance` Modal (`SyncBalanceModal`)', async ({ page }) => {
    await page.goto('/dashboard');

    const syncBtn = page.getByRole('button', { name: 'Sync Balance' }).first();
    await expect(syncBtn).toBeVisible();
    await syncBtn.click();

    const modal = page.getByRole('dialog').first();
    await expect(modal).toBeVisible();
    await expect(modal.locator('input[inputmode="decimal"]').first()).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('5.3 Keyboard Shortcuts Discovery Modal (`?` Key Trigger)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.locator('main').first().waitFor({ state: 'visible' });

    await page.keyboard.press('Shift+?');
    const shortcutsModal = page
      .getByRole('dialog')
      .filter({ hasText: /Keyboard Shortcuts/i })
      .first();
    await expect(shortcutsModal).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(shortcutsModal).not.toBeVisible();
  });

  test('5.4 "Can I Afford It?" Action Strip Button & Instant Modal Audit', async ({ page }) => {
    await page.goto('/dashboard');

    const affordBtn = page.locator('[data-tour="afford-check"], button:has-text("Can I Afford")').first();
    await expect(affordBtn).toBeVisible();
    await affordBtn.click();

    const affordModal = page.getByRole('dialog').filter({ hasText: /Can I Afford/i }).first();
    await expect(affordModal).toBeVisible();

    const amountInput = affordModal.locator('input[inputmode="decimal"]').first();
    await expect(amountInput).toBeVisible();
    await amountInput.fill('180.00');

    await page.keyboard.press('Escape');
    await expect(affordModal).not.toBeVisible();
  });

  test('5.5 Global Search & Ask Penny Command Palette (`⌘K` + Search + Greeting)', async ({ page }) => {
    await page.goto('/dashboard');

    await page.locator('[data-tour="ask-penny"]').first().click();
    const paletteDialog = page.getByRole('dialog').first();
    await expect(paletteDialog).toBeVisible();
    await expect(paletteDialog.getByText('Pages & Quick Actions').first()).toBeVisible();
    await expect(paletteDialog.getByRole('button', { name: /Bank Accounts/i }).first()).toBeVisible();
    await expect(paletteDialog.getByRole('button', { name: /Envelopes/i }).first()).toBeVisible();

    const paletteInput = paletteDialog.locator('input').first();
    await paletteInput.fill('Settings');
    await expect(paletteDialog.getByText('Profile, household, billing, and preferences').first()).toBeVisible();

    await paletteInput.fill('Hi');
    await page.keyboard.press('Enter');

    await expect(paletteDialog.getByText(/Money Matters assistant/i).first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(paletteDialog).not.toBeVisible();
  });

  test('5.6 Dashboard `+ Quick Action` Split Menu & 3-Tab Drawer', async ({ page }) => {
    await page.goto('/dashboard');

    const dropdownTrigger = page.locator('button[aria-haspopup="true"][aria-label="+ Quick Action"]').first();
    await expect(dropdownTrigger).toBeVisible();
    await dropdownTrigger.click();

    await expect(page.getByRole('button', { name: /Record Bill or Goal Spend/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Record Income/i }).first()).toBeVisible();

    const transferItem = page.getByRole('button', { name: /Transfer between Envelopes/i }).first();
    await expect(transferItem).toBeVisible();
    await transferItem.click();

    const drawer = page.getByRole('dialog').first();
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Expense', exact: true }).first()).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Income', exact: true }).first()).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Transfer', exact: true }).first()).toBeVisible();

    await drawer.getByRole('button', { name: /Cancel/i }).first().click();
    await expect(drawer).not.toBeVisible();
  });

  test('5.7 Scoped Dashboard 404 Page Audit (`/dashboard/invalid-route-xyz`)', async ({ page }) => {
    await page.goto('/dashboard/invalid-route-xyz');

    await expect(page.getByText('404').first()).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 1, name: /We couldn't find that page/i }).first()
    ).toBeVisible();
    await expect(page.locator('a[href="/dashboard"]').first()).toBeVisible();
  });
});
