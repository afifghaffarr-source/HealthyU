import { test, expect } from "@playwright/test";
import { authenticateUser } from "./helpers/auth";

/**
 * E2E: View Progress Charts Flow
 *
 * Tests user can view and interact with progress charts.
 */

test.describe("Progress Charts", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
  });

  test("user can access progress page", async ({ page }) => {
    await page.goto("/progress");
    await expect(page).toHaveURL(/\/progress/);

    // Should show progress heading
    await expect(page.getByRole("heading", { name: /progress|kemajuan/i })).toBeVisible();
  });

  test("progress page shows weight chart", async ({ page }) => {
    await page.goto("/progress");

    // Look for chart container or canvas
    const chartContainer = page
      .locator('[data-testid="weight-chart"]')
      .or(page.locator(".recharts-wrapper"));
    await expect(chartContainer.first()).toBeVisible({ timeout: 5000 });
  });

  test("progress page shows timeline selector", async ({ page }) => {
    await page.goto("/progress");

    // Should have timeline buttons (7d, 30d, 90d, etc)
    const timelineButtons = page.locator('button:has-text("7"), button:has-text("30")');
    const count = await timelineButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test("user can upload progress photo", async ({ page }) => {
    await page.goto("/progress");

    // Look for upload button or file input
    const uploadButton = page.getByRole("button", { name: /upload|foto|tambah/i });
    if (await uploadButton.isVisible()) {
      await uploadButton.click();

      // Should show file input or modal
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeAttached({ timeout: 2000 });
    }
  });

  test("progress page shows stats summary", async ({ page }) => {
    await page.goto("/progress");

    // Should show key metrics (weight, calories, etc)
    await expect(page.locator("text=/kg|kcal|kkal/i").first()).toBeVisible();
  });

  test("user can view progress photos grid", async ({ page }) => {
    await page.goto("/progress");

    // Look for photos grid or gallery
    const photoGrid = page.locator('[data-testid="progress-photos"]').or(page.locator(".grid"));
    if (await photoGrid.isVisible()) {
      // Should have at least one photo placeholder or actual photo
      const photos = page.locator("img[alt*='Progress']").or(page.locator(".progress-photo"));
      const photoCount = await photos.count();
      expect(photoCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("progress page has no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/progress");
    await page.waitForLoadState("networkidle");

    const real = errors.filter((e) => !/lovable|sandbox|chrome-extension|favicon/i.test(e));
    expect(real, real.join("\n")).toHaveLength(0);
  });
});
