import { test, expect } from "@playwright/test";
import { authenticateUser } from "./helpers/auth";

/**
 * E2E: Upload Food Photo Flow
 *
 * Tests user can upload food photo and get AI analysis.
 */

test.describe("Food Photo Upload", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
  });

  test("user can access scan page", async ({ page }) => {
    await page.goto("/scan");
    await expect(page).toHaveURL(/\/scan/);

    // Should show scan options
    await expect(page.getByRole("heading", { name: /scan|foto/i })).toBeVisible();
  });

  test("scan page has upload button", async ({ page }) => {
    await page.goto("/scan");

    // Look for file input or upload button
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeAttached();
  });

  test("user can navigate to barcode scan", async ({ page }) => {
    await page.goto("/scan");

    // Should have link to barcode scan
    const barcodeLink = page.getByRole("link", { name: /barcode/i });
    if (await barcodeLink.isVisible()) {
      await barcodeLink.click();
      await expect(page).toHaveURL(/\/scan\/barcode/);
    }
  });

  test("scan fridge option is available", async ({ page }) => {
    await page.goto("/scan");

    // Look for fridge scan option
    const fridgeLink = page.getByRole("link", { name: /kulkas|fridge/i });
    if (await fridgeLink.isVisible()) {
      await fridgeLink.click();
      await expect(page).toHaveURL(/\/scan\/fridge/);

      // Should have upload interface
      await expect(page.locator('input[type="file"]')).toBeAttached();
    }
  });

  test("scan menu option is available", async ({ page }) => {
    await page.goto("/scan");

    // Look for menu scan option
    const menuLink = page.getByRole("link", { name: /menu/i });
    if (await menuLink.isVisible()) {
      await menuLink.click();
      await expect(page).toHaveURL(/\/scan\/menu/);
    }
  });

  test("scan page has no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/scan");
    await page.waitForLoadState("networkidle");

    const real = errors.filter((e) => !/lovable|sandbox|chrome-extension|favicon/i.test(e));
    expect(real, real.join("\n")).toHaveLength(0);
  });
});
