import { test, expect } from '@playwright/test';

const MOCK_TOKEN = '11111111-1111-4111-8111-111111111111';

test.describe('Partner Invite Flow (`/invite/[token]`)', () => {
  test('renders read-only invited email and inline Set Password form for new users', async ({ page }) => {
    await page.route('**/api/trpc/getInviteDetails*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            result: {
              data: {
                status: 'VALID',
                emailMismatch: false,
                inviteEmail: 'partner@example.com',
                householdName: 'Smith Family',
                accountStatus: 'NEW',
              },
            },
          },
        ]),
      });
    });

    await page.goto(`/invite/${MOCK_TOKEN}`);
    await expect(page.getByRole('heading', { name: /Join Household/i })).toBeVisible();
    await expect(page.getByText(/Smith Family/)).toBeVisible();

    const emailInput = page.locator('#invite-readonly-email');
    await expect(emailInput).toHaveValue('partner@example.com');
    await expect(emailInput).toBeDisabled();

    await expect(page.getByRole('button', { name: /Sign up with Google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Set Password & Join/i })).toBeVisible();
  });

  test('renders Sign In & Join form when invited email already has a password account', async ({ page }) => {
    await page.route('**/api/trpc/getInviteDetails*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            result: {
              data: {
                status: 'VALID',
                emailMismatch: false,
                inviteEmail: 'existing@example.com',
                householdName: 'Smith Family',
                accountStatus: 'CREDENTIAL',
              },
            },
          },
        ]),
      });
    });

    await page.goto(`/invite/${MOCK_TOKEN}`);
    await expect(page.locator('#invite-readonly-email')).toHaveValue('existing@example.com');
    await expect(page.getByRole('button', { name: /Sign In & Join/i })).toBeVisible();
  });

  test('renders expired error message for expired invite tokens', async ({ page }) => {
    await page.route('**/api/trpc/getInviteDetails*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ result: { data: { status: 'EXPIRED' } } }]),
      });
    });

    await page.goto(`/invite/${MOCK_TOKEN}`);
    await expect(page.getByText(/invitation has expired/i)).toBeVisible();
  });
});
