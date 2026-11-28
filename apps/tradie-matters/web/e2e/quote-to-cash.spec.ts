import { expect, test } from "@playwright/test";

test.describe("Quote-to-Cash, Suppliers, Inbox & Settings", () => {
  test("guards jobs, quotes, and invoices routes behind authentication", async ({ page }) => {
    await page.goto("/dashboard/quotes");
    await expect(page).toHaveURL(/\/sign-in/);

    await page.goto("/dashboard/jobs");
    await expect(page).toHaveURL(/\/sign-in/);

    await page.goto("/dashboard/invoices");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("guards suppliers, inbox, and settings routes behind authentication", async ({ page }) => {
    await page.goto("/dashboard/suppliers");
    await expect(page).toHaveURL(/\/sign-in/);

    await page.goto("/dashboard/inbox");
    await expect(page).toHaveURL(/\/sign-in/);

    await page.goto("/dashboard/settings");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
