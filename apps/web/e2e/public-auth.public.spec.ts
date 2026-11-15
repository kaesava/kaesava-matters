import { test, expect } from '@playwright/test';

/**
 * Public Marketing, SEO, Legal, Auth & Route-Guard E2E Suite (`public-chromium`)
 *
 * Always executes with a fresh unauthenticated storageState so public forms and
 * auth redirects work identically whether or not E2E_AUTHENTICATED=1 is set.
 */
test.describe('1. Public Marketing, SEO, Blog & Legal Pages', () => {
  test('1.1 Landing Hero Header, Auth Modal & Legal Links (`/`)', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Money\s*Matters/i);
    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(/Zero bill shock/i);

    const logoLink = page.locator('header a, nav a, a[href="/"]').first();
    await expect(logoLink).toBeVisible();

    const getStartedBtn = page
      .locator('button:has-text("Start 60-Day Free Trial"), a:has-text("Get Started"), button:has-text("Get Started")')
      .first();
    await expect(getStartedBtn).toBeVisible();
    await getStartedBtn.click();

    const authModal = page.getByRole('dialog').first();
    await expect(authModal).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(authModal).not.toBeVisible();

    await expect(page.locator('a[href="/terms"]').first()).toBeVisible();
    await expect(page.locator('a[href="/privacy"]').first()).toBeVisible();
  });

  test('1.2 Terms of Service Page Audit (`/terms`)', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.getByText('Terms of Service').first()).toBeVisible();
  });

  test('1.3 Privacy Policy Page Audit (`/privacy`)', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.getByText('Privacy Policy').first()).toBeVisible();
  });

  test('1.4 Branded Custom 404 Page Audit (`/invalid-route-xyz`)', async ({ page }) => {
    await page.goto('/invalid-route-xyz');
    await expect(
      page.locator('h1, h2, div').filter({ hasText: /404|Page not found/i }).first()
    ).toBeVisible();
    await expect(page.locator('a[href="/dashboard"], a[href="/"]').first()).toBeVisible();
  });

  test('1.5 Interactive Payday Timeline Simulator & Transfer Modal (`/#simulator`)', async ({ page }) => {
    await page.goto('/#simulator');

    const simSection = page.locator('section#simulator');
    await expect(simSection).toBeVisible();

    const count = await simSection.locator('.grid > div').count();
    expect(count).toBeGreaterThanOrEqual(4);

    const transferBtn = simSection.getByRole('button', { name: /Transfer/i }).first();
    await expect(transferBtn).toBeVisible();
    await transferBtn.click();

    const transferModal = page
      .getByRole('dialog')
      .filter({ hasText: /Transfer Between Envelopes|Transfer/i })
      .first();
    await expect(transferModal).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(transferModal).not.toBeVisible();
  });

  test('1.6 Blog Index, Article Reader & Missing Slug 404 (`/blog`, `/blog/[slug]`)', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(
      /Why We Built Money Matters/i
    );

    const firstArticleCard = page.getByRole('article').first();
    await expect(firstArticleCard).toBeVisible();

    await expect(async () => {
      if (new URL(page.url()).pathname === '/blog') {
        await firstArticleCard.click();
      }
      await expect(page).toHaveURL(/\/blog\/.+/, { timeout: 2000 });
    }).toPass({ timeout: 15_000 });

    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

    await page.goto('/blog/non-existent-article-slug-xyz');
    await expect(page.getByRole('heading', { level: 1, name: /Article Not Found/i })).toBeVisible();
  });

  test('1.7 SEO Robots & Sitemap Endpoints (`/robots.txt`, `/sitemap.xml`)', async ({ request }) => {
    const robotsRes = await request.get('/robots.txt');
    expect(robotsRes.ok()).toBe(true);
    const robotsText = await robotsRes.text();
    expect(robotsText).toContain('Disallow: /dashboard/');
    expect(robotsText).toContain('sitemap.xml');

    const sitemapRes = await request.get('/sitemap.xml');
    expect(sitemapRes.ok()).toBe(true);
    const sitemapText = await sitemapRes.text();
    expect(sitemapText).toContain('<urlset');
  });
});

test.describe('2. Unauthenticated Auth, Password Recovery & Invite Screens', () => {
  test('2.1 Sign-In Fields & Social OAuth Controls (`/sign-in`)', async ({ page }) => {
    await page.goto('/sign-in');

    const emailInput = page.locator('#signin-email');
    const passwordInput = page.locator('#signin-password');
    const signInBtn = page.locator('button[type="submit"]').first();
    const googleBtn = page.getByRole('button', { name: /Google/i }).first();
    const forgotPasswordLink = page.locator('a[href*="forgot-password"]').first();

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(signInBtn).toBeVisible();
    await expect(googleBtn).toBeVisible();
    await expect(forgotPasswordLink).toBeVisible();

    await expect(async () => {
      await emailInput.fill('');
      await passwordInput.fill('');
      await emailInput.fill('user@moneymatters.au');
      await passwordInput.fill('Password123!');
      await expect(signInBtn).toBeEnabled({ timeout: 2000 });
    }).toPass({ timeout: 20_000 });
  });

  test('2.2 Sign-Up Fields & Password Controls (`/sign-up`)', async ({ page }) => {
    await page.goto('/sign-up');

    const nameInput = page.locator('input#signup-name, input[autocomplete="name"], input[name="name"]').first();
    const emailInput = page.locator('input#signup-email, input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    await expect(async () => {
      await nameInput.fill('Aussie User');
      await emailInput.fill('newuser@moneymatters.au');
      await passwordInput.fill('Pass123!');
      await expect(emailInput).toHaveValue('newuser@moneymatters.au');
    }).toPass({ timeout: 15_000 });
  });

  test('2.3 Forgot Password Screen Field Audit (`/forgot-password`)', async ({ page }) => {
    await page.goto('/forgot-password');

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await expect(emailInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
    await emailInput.fill('reset@moneymatters.au');
    await expect(emailInput).toHaveValue('reset@moneymatters.au');
  });

  test('2.4 Reset Password Screen Field Audit (`/reset-password`)', async ({ page }) => {
    await page.goto('/reset-password?token=mock-valid-token-12345');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

    const passwordInputs = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(passwordInputs.first()).toBeVisible();

    await expect(async () => {
      await passwordInputs.first().fill('');
      await passwordInputs.nth(1).fill('');
      await passwordInputs.first().fill('NewSecurePass123!');
      await passwordInputs.nth(1).fill('NewSecurePass123!');
      await expect(submitBtn).toBeEnabled({ timeout: 2000 });
    }).toPass({ timeout: 20_000 });
  });

  test('2.5 Partner Invite Unauthenticated Onboarding Audit (`/invite/[token]`)', async ({ page }) => {
    await page.goto('/invite/sample-token-123');
    await expect(
      page.locator('h1:has-text("Join Household"), div:has-text("Join Household")').first()
    ).toBeVisible();
    await expect(page.locator('button:has-text("Create Account"), a[href*="sign-up"]').first()).toBeVisible();
  });
});

test.describe('3. Unauthenticated Auth-Guard Redirect Enforcement', () => {
  test('3.1 Protected App Routes Redirect to `/sign-in` When Unauthenticated', async ({ page }) => {
    const protectedRoutes = [
      '/dashboard',
      '/setup',
      '/complete-profile',
      '/dashboard/plan',
      '/dashboard/envelopes',
      '/dashboard/bank-accounts',
      '/dashboard/history',
      '/dashboard/payday-plan',
      '/dashboard/settings',
      '/dashboard/reports',
      '/dashboard/afford-check',
      '/subscription/upgrade',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/sign-in/);
    }
  });

  test('3.2 OAuth Callback Error Forwards Cleanly to `/sign-in`', async ({ page }) => {
    await page.goto('/auth-callback?error=account_not_linked');
    await expect(page).toHaveURL(/\/sign-in\?error=account_not_linked/);
    await expect(page.getByText(/already exists/i).first()).toBeVisible();

    await page.goto('/auth-callback?error=oauth_failed');
    await expect(page).toHaveURL(/\/sign-in\?error=oauth_failed/);
    await expect(page.getByText(/Google sign-in could not be completed/i).first()).toBeVisible();
  });
});
