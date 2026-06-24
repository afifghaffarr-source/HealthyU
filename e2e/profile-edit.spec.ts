import { test, expect } from "@playwright/test";
import { authenticateUser } from "./helpers/auth";

/**
 * E2E: Edit Profile Flow
 *
 * Tests user can view and update profile information.
 */

test.describe("Profile Edit", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
  });

  test("user can view profile page", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/profile/);

    // Should show profile form
    await expect(page.getByRole("heading", { name: /profil|profile/i })).toBeVisible();
  });

  test("user can edit display name", async ({ page }) => {
    await page.goto("/profile");

    // Find name input
    const nameInput = page.locator('input[name="full_name"]');
    await expect(nameInput).toBeVisible();

    // Get current value
    const originalName = await nameInput.inputValue();

    // Change to test name
    const testName = `E2E Test ${Date.now()}`;
    await nameInput.fill(testName);

    // Save
    const saveButton = page.getByRole("button", { name: /simpan|save/i });
    await saveButton.click();

    // Wait for success (toast or redirect)
    await page.waitForTimeout(2000);

    // Reload and verify persisted
    await page.reload();
    await expect(nameInput).toHaveValue(testName);

    // Restore original name
    await nameInput.fill(originalName);
    await saveButton.click();
    await page.waitForTimeout(1000);
  });

  test("profile page shows user stats", async ({ page }) => {
    await page.goto("/profile");

    // Should show streak or other stats
    await expect(page.locator("text=/streak|hari|scan/i").first()).toBeVisible();
  });

  test("user can navigate to settings from profile", async ({ page }) => {
    await page.goto("/profile");

    // Look for settings link/button
    const settingsLink = page.getByRole("link", { name: /pengaturan|settings/i }).first();
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await expect(page).toHaveURL(/\/settings/);
    }
  });
});
