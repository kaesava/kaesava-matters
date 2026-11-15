import { test, expect } from '@playwright/test';

/**
 * Authenticated Plan, History & Settings E2E Suite
 */
test.describe('8. Plan Command Center (`/dashboard/plan`) & Payday Plan (`/dashboard/payday-plan`)', () => {
  test('8.1 Plan Tabs, Upcoming Search, 12-Month Payday Plan & Schedules Modals', async ({ page }) => {
    await page.goto('/dashboard/plan');
    await expect(page.locator('main').first()).toBeVisible();

    const upcomingTab = page.getByRole('button', { name: 'Upcoming' }).first();
    const matrixTab = page.getByRole('button', { name: '12-Month Payday Plan' }).first();
    const schedulesTab = page.getByRole('button', { name: 'Schedules' }).first();

    await expect(upcomingTab).toBeVisible();
    await expect(matrixTab).toBeVisible();
    await expect(schedulesTab).toBeVisible();

    const upcomingSearch = page.locator('input[data-search-input="true"]').first();
    await expect(upcomingSearch).toBeVisible();
    await upcomingSearch.fill('Salary');
    await expect(upcomingSearch).toHaveValue('Salary');

    await matrixTab.click();
    await expect(page.locator('table').first()).toBeVisible();

    await schedulesTab.click();
    const addIncomeBtn = page.getByRole('button', { name: /Add Income Schedule/i }).first();
    const addBillBtn = page.getByRole('button', { name: /Add Bill Schedule/i }).first();
    const oneOffBtn = page.getByRole('button', { name: /One-off Expense/i }).first();

    await expect(addIncomeBtn).toBeVisible();
    await expect(addBillBtn).toBeVisible();
    await expect(oneOffBtn).toBeVisible();

    await addIncomeBtn.click();
    const incomeModal = page.getByRole('dialog').first();
    await expect(incomeModal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(incomeModal).not.toBeVisible();

    await addBillBtn.click();
    const billModal = page.getByRole('dialog').first();
    await expect(billModal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(billModal).not.toBeVisible();
  });

  test('8.2 Payday Plan Guarded Redirect Without Event ID (`/dashboard/payday-plan`)', async ({ page }) => {
    await page.goto('/dashboard/payday-plan');
    await expect(page).toHaveURL(/\/dashboard\/plan\?tab=matrix/);
  });
});

test.describe('9. History & Payday Plans 2-Tab Screen (`/dashboard/history`)', () => {
  test('9.1 Transactions Filters, Sorting, CSV Export & Payday Plans Tab', async ({ page }) => {
    await page.goto('/dashboard/history');

    await expect(page.getByRole('heading', { level: 1, name: /^History$/i }).first()).toBeVisible();
    await expect(page.locator('[data-tour="history-ledger"]').first()).toBeVisible();

    const transferFilterBtn = page.getByRole('button', { name: 'Transfer', exact: true }).first();
    await expect(transferFilterBtn).toBeVisible();
    await transferFilterBtn.click();

    const dateHeader = page.locator('th:has-text("Date")').first();
    await expect(dateHeader).toBeVisible();
    await dateHeader.click();

    await expect(page.locator('button:has-text("CSV")').first()).toBeVisible();

    const paydayTab = page.getByRole('button', { name: 'Payday Plans' }).first();
    await expect(paydayTab).toBeVisible();
    await paydayTab.click();

    await expect(page.locator('table, :text("No Payday Plans Yet")').first()).toBeVisible();
  });
});

test.describe('10. Settings 4-Tab Layout, Governance & Subpages (`/dashboard/settings`)', () => {
  test('10.1 Settings 4 Tabs (`Profile`, `Household`, `Archive`, `Plan`), Feedback & Version', async ({ page }) => {
    await page.goto('/dashboard/settings');

    await expect(page.getByRole('heading', { level: 1, name: /^Settings$/i }).first()).toBeVisible();
    const profileTab = page.getByRole('button', { name: 'Profile', exact: true }).first();
    const householdTab = page.getByRole('button', { name: 'Household', exact: true }).first();
    const archiveTab = page.getByRole('button', { name: 'Archive', exact: true }).first();
    const planTab = page.getByRole('button', { name: 'Plan', exact: true }).last();

    await expect(profileTab).toBeVisible();
    await expect(householdTab).toBeVisible();
    await expect(archiveTab).toBeVisible();
    await expect(planTab).toBeVisible();

    await householdTab.click();
    await expect(page.locator('h2, h3').filter({ hasText: /Household Members/i }).first()).toBeVisible();
    await expect(page.locator('section').filter({ hasText: /Danger Zone/i }).first()).toBeVisible();
    await expect(page.locator('a[href*="/dashboard/settings/allocation-rules"]').first()).toBeVisible();

    await archiveTab.click();
    await expect(page.locator('input[placeholder*="Search archived items"]').first()).toBeVisible();

    await page.goto('/dashboard/settings?tab=account-data');
    await expect(page.getByRole('heading', { level: 3, name: /Penny AI Assistant Usage/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Download Zipped CSV Backup/i }).first()).toBeVisible();

    await expect(page.getByRole('button', { name: /Take Product Tour/i }).first()).toBeVisible();
    await expect(page.locator('button:has-text("Money Matters v")').first()).toBeVisible();

    const feedbackBtn = page.getByRole('button', { name: /Provide Feedback/i }).first();
    await expect(feedbackBtn).toBeVisible();
    await feedbackBtn.click();

    const feedbackModal = page.getByRole('dialog').filter({ hasText: /Provide Feedback/i }).first();
    await expect(feedbackModal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(feedbackModal).not.toBeVisible();
  });

  test('10.2 Profile Avatar Upload & Cropper Modal (`/dashboard/settings?tab=profile`)', async ({ page }) => {
    await page.goto('/dashboard/settings?tab=profile');

    const editBtn = page.getByRole('button', { name: 'Edit', exact: true }).first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    const fileInput = page.locator('input[type="file"][accept*="image"]').first();
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    await fileInput.setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer,
    });

    const cropModal = page.getByRole('dialog').filter({ hasText: /Crop|Avatar/i }).first();
    await expect(cropModal).toBeVisible();
    await expect(cropModal.locator('canvas').first()).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(cropModal).not.toBeVisible();
  });

  test('10.3 Household Danger Zone Typed Confirmation Modal (`/dashboard/settings?tab=household`)', async ({ page }) => {
    await page.goto('/dashboard/settings?tab=household');

    const deleteCta = page.locator('section').filter({ hasText: /Danger Zone/i }).locator('button').last();
    await expect(deleteCta).toBeVisible();
    await deleteCta.click();

    const confirmDialog = page.getByRole('dialog').first();
    await expect(confirmDialog).toBeVisible();

    await confirmDialog.getByRole('button', { name: /Cancel/i }).first().click();
    await expect(confirmDialog).not.toBeVisible();
  });

  test('10.4 Payday Rules & Allocation Recipe (`/dashboard/settings/allocation-rules`)', async ({ page }) => {
    await page.goto('/dashboard/settings/allocation-rules');

    await expect(page.getByRole('heading', { level: 1, name: /Payday Rules/i }).first()).toBeVisible();
    await expect(page.getByText('Balanced').first()).toBeVisible();
    await expect(page.getByText('Bills Fortress').first()).toBeVisible();
    await expect(page.getByText('Pay Yourself First').first()).toBeVisible();
  });

  test('10.5 Notification Preferences Toggle & Deterministic Persistence (`/dashboard/settings/notifications`)', async ({
    page,
  }) => {
    await page.goto('/dashboard/settings/notifications');

    await expect(page.getByRole('heading', { level: 1, name: /Notification Preferences/i }).first()).toBeVisible();
    await expect(page.getByText('Weekly Balance Digest').first()).toBeVisible();
    await expect(page.getByText('Payday Plan Alerts').first()).toBeVisible();
    await expect(page.getByText('Bank Balance Match Nudge').first()).toBeVisible();

    const checkboxes = page.locator('input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(6);

    // Wait for initial preferences query hydration (channel status card renders once user prefs + channels resolve).
    await expect(page.getByText(/Emails deliver to/i).first()).toBeVisible();

    const firstCheckbox = checkboxes.first();
    const initialChecked = await firstCheckbox.isChecked();

    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/trpc/updateUserPreferences') && res.ok(),
        { timeout: 15_000 }
      ),
      firstCheckbox.click(),
    ]);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Emails deliver to/i).first()).toBeVisible();
    await expect(page.locator('input[type="checkbox"]').first()).toBeChecked({ checked: !initialChecked });

    // Restore initial state so repeated dev runs start clean.
    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/trpc/updateUserPreferences') && res.ok(),
        { timeout: 15_000 }
      ),
      page.locator('input[type="checkbox"]').first().click(),
    ]);
  });

  test('10.6 Anonymous Product Telemetry Consent & Persistence (`/dashboard/settings?tab=account-data`)', async ({
    page,
  }) => {
    await page.goto('/dashboard/settings?tab=account-data');
    await expect(page.getByText('Anonymous Product Telemetry').first()).toBeVisible();

    const toggle = page.getByRole('checkbox', { name: /Anonymous Product Telemetry/i });
    const initialChecked = await toggle.isChecked();

    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/trpc/updateUserPreferences') && res.ok(),
        { timeout: 15_000 }
      ),
      toggle.click({ force: true }),
    ]);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('checkbox', { name: /Anonymous Product Telemetry/i })).toBeChecked({
      checked: !initialChecked,
    });

    // Restore initial state
    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/trpc/updateUserPreferences') && res.ok(),
        { timeout: 15_000 }
      ),
      page.getByRole('checkbox', { name: /Anonymous Product Telemetry/i }).click({ force: true }),
    ]);
  });
});
