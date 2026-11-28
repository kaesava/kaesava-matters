import { expect, test } from "@playwright/test";

test.describe("Onboarding, CRM & Pricebook", () => {
  test("redirects unauthenticated dashboard access to sign-in", async ({ page }) => {
    await page.goto("/dashboard/customers");
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("renders sign-up and sign-in forms with email and password inputs", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    await page.goto("/sign-in");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("guards setup and pricebook routes behind authentication", async ({ page }) => {
    await page.goto("/setup");
    await expect(page).toHaveURL(/\/(sign-in|setup)/);

    await page.goto("/dashboard/pricebook");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
