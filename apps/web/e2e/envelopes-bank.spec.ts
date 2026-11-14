import { test, expect } from '@playwright/test';

/**
 * Authenticated Bank Accounts & Envelopes Feature E2E Suite
 */
test.describe('6. Bank Accounts Screen (`/dashboard/bank-accounts`)', () => {
  test('6.1 Table Layout, Search Filter & No Redundant Actions Column', async ({ page }) => {
    await page.goto('/dashboard/bank-accounts');

    await expect(page.getByRole('heading', { level: 2, name: /Bank accounts/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Add Bank Account/i }).first()).toBeVisible();

    const searchInput = page.locator('input[data-search-input="true"]').first();
    await expect(searchInput).toBeVisible();

    await expect(page.locator('table').first()).toBeVisible();
    await expect(page.locator('th:has-text("Actions")')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Import CSV/i })).toHaveCount(0);
  });

  test('6.2 Add Bank Account Modal & Dirty Discard Confirmation (`BankAccountFormModal`)', async ({ page }) => {
    await page.goto('/dashboard/bank-accounts');

    await page.getByRole('button', { name: /Add Bank Account/i }).first().click();

    const modal = page.getByRole('dialog').first();
    await expect(modal).toBeVisible();

    const cbaChip = modal.getByRole('button', { name: /Commonwealth Bank \(CBA\)/i }).first();
    const accountNameInput = modal.locator('input[type="text"]').first();
    const amountInputs = modal.locator('input[inputmode="decimal"]');

    await expect(cbaChip).toBeVisible();
    await expect(accountNameInput).toBeVisible();
    await expect(amountInputs.nth(0)).toBeVisible();
    await expect(amountInputs.nth(1)).toBeVisible();

    await cbaChip.click();
    await accountNameInput.fill('CBA Smart Access');
    await amountInputs.nth(0).fill('3200.00');
    await amountInputs.nth(1).fill('500.00');

    await modal.getByRole('button', { name: /Cancel/i }).first().click();
    const discardBtn = page.getByRole('button', { name: /^Discard$/i }).first();
    await expect(discardBtn).toBeVisible();
    await discardBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('6.3 Edit Existing Account Modal & File Notes Drawer (`FileNotesDrawer`)', async ({ page }) => {
    await page.goto('/dashboard/bank-accounts');

    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();

    const firstAccountBtn = firstRow.locator('td').first().locator('button').first();
    await expect(firstAccountBtn).toBeVisible();
    await firstAccountBtn.click();

    const editModal = page.getByRole('dialog').first();
    await expect(editModal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(editModal).not.toBeVisible();

    const fileNotesBtn = firstRow.locator('button[title*="notes" i]').first();
    await expect(fileNotesBtn).toBeVisible();
    await fileNotesBtn.click();

    const notesDrawer = page.getByRole('dialog').first();
    await expect(notesDrawer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(notesDrawer).not.toBeVisible();
  });
});

test.describe('7. Envelopes & Move Money Screen (`/dashboard/envelopes`)', () => {
  test('7.1 Envelope Search Filter, Type Pills & Table Audit', async ({ page }) => {
    await page.goto('/dashboard/envelopes');

    await expect(page.getByRole('button', { name: /^All$/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Everyday$/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Bills$/i }).first()).toBeVisible();

    const goalsPill = page.getByRole('button', { name: /^Goals$/i }).first();
    await expect(goalsPill).toBeVisible();
    await goalsPill.click();

    const searchInput = page.locator('input[data-search-input="true"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Dining');
    await expect(searchInput).toHaveValue('Dining');

    await expect(page.locator('table').first()).toBeVisible();
  });

  test('7.2 Add Envelope Modal & Escape Close (`EnvelopeFormModal`)', async ({ page }) => {
    await page.goto('/dashboard/envelopes');

    await page.getByRole('button', { name: /Add Envelope/i }).first().click();

    const modal = page.getByRole('dialog').first();
    await expect(modal).toBeVisible();
    await expect(modal.locator('input[type="text"]').first()).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('7.3 Envelope Detail Drawer (`EnvelopeDetailDrawer` Upcoming, Activity & Notes Tabs)', async ({ page }) => {
    await page.goto('/dashboard/envelopes');

    const firstEnvelopeBtn = page.locator('tbody tr').first().locator('td').first().locator('button').first();
    await expect(firstEnvelopeBtn).toBeVisible();
    await firstEnvelopeBtn.click();

    const drawer = page.getByRole('dialog').first();
    await expect(drawer).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
  });

  test('7.4 Actions -> Move Money Drawer & Dirty Discard Prompt', async ({ page }) => {
    await page.goto('/dashboard/envelopes');

    const actionsBtn = page.getByRole('button', { name: 'Actions' }).first();
    await expect(actionsBtn).toBeVisible();
    await actionsBtn.click();

    const moveMoneyItem = page.getByRole('button', { name: /Move Money/i }).first();
    await expect(moveMoneyItem).toBeVisible();
    await moveMoneyItem.click();

    const drawer = page.getByRole('dialog').first();
    await expect(drawer).toBeVisible();

    const transferAmount = drawer.locator('input[inputmode="decimal"]').first();
    await expect(transferAmount).toBeVisible();
    await transferAmount.fill('75.00');

    // Escape on a dirty drawer triggers the Discard Changes confirmation dialog.
    await page.keyboard.press('Escape');
    const discardBtn = page.getByRole('button', { name: /^Discard$/i }).first();
    await expect(discardBtn).toBeVisible();
    await discardBtn.click();
    await expect(drawer).not.toBeVisible();
  });

  test('7.5 Actions -> Future Projection Mode Scrubber & Exit', async ({ page }) => {
    await page.goto('/dashboard/envelopes');

    const actionsBtn = page.getByRole('button', { name: 'Actions' }).first();
    await expect(actionsBtn).toBeVisible();
    await actionsBtn.click();

    const projectionBtn = page.getByRole('button', { name: /Future Projection/i }).first();
    await expect(projectionBtn).toBeVisible();
    await projectionBtn.click();

    const exitBtn = page.locator('button[title="Exit Projection Mode"]').first();
    await expect(exitBtn).toBeVisible();
    await expect(page.getByRole('button', { name: '+3M', exact: true })).toBeVisible();
    await page.getByRole('button', { name: '+3M', exact: true }).click();
    await exitBtn.click();
    await expect(exitBtn).not.toBeVisible();
  });
});
