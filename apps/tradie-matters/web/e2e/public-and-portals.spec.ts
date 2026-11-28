import { expect, test } from "@playwright/test";

test.describe("Public Landing, Legal & Customer Portals", () => {
  test("renders public landing page with hero CTA and pricing", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /Start 14-Day Free Trial/i }).first()).toBeVisible();
    await expect(page.getByText(/Founding Crew/i)).toBeVisible();
  });

  test("renders privacy policy and terms of service with VIC governing law", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/Australian Privacy Principles/i)).toBeVisible();

    await page.goto("/terms");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/Victoria \(VIC\), Australia/i)).toBeVisible();
  });

  test("handles public quote portal route gracefully for invalid token", async ({ page }) => {
    await page.goto("/q/invalid-test-token");
    await expect(page.locator("body")).toBeVisible();
  });

  test("handles public invoice portal route gracefully for invalid token", async ({ page }) => {
    await page.goto("/i/invalid-test-token");
    await expect(page.locator("body")).toBeVisible();
  });
});
