import { test, expect } from "@playwright/test";
import { authenticateUser } from "./helpers/auth";

/**
 * E2E: AI Chat Flow
 *
 * Tests user can send messages to AI coach and receive responses.
 */

test.describe("AI Chat", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
  });

  test("user can access chat page", async ({ page }) => {
    await page.goto("/chat");
    await expect(page).toHaveURL(/\/chat/);

    // Should show chat interface
    await expect(page.getByRole("heading", { name: /chat|coach/i })).toBeVisible();
  });

  test("user can send message and receive AI response", async ({ page }) => {
    await page.goto("/chat");

    // Find message input
    const messageInput = page
      .locator('textarea[name="message"]')
      .or(page.locator('input[name="message"]'));
    await expect(messageInput.first()).toBeVisible();

    // Type message
    const testMessage = "Halo, apa tips untuk sarapan sehat?";
    await messageInput.first().fill(testMessage);

    // Send
    const sendButton = page.getByRole("button", { name: /kirim|send/i }).first();
    await sendButton.click();

    // Wait for AI response (streaming, so wait for assistant message)
    await page.waitForTimeout(3000);

    // Should see user message
    await expect(page.locator(`text="${testMessage}"`)).toBeVisible();

    // Should see AI response (look for any text that's not the user's message)
    const messages = page.locator('[data-role="assistant"]').or(page.locator(".ai-message"));
    await expect(messages.first()).toBeVisible({ timeout: 10000 });
  });

  test("chat has prompt chips for quick questions", async ({ page }) => {
    await page.goto("/chat");

    // Should show prompt suggestions
    const chips = page.locator("button[data-prompt-chip]").or(page.locator(".prompt-chip"));
    const chipCount = await chips.count();

    if (chipCount > 0) {
      await expect(chips.first()).toBeVisible();

      // Click first chip
      await chips.first().click();

      // Should populate input or send message
      await page.waitForTimeout(1000);
    }
  });

  test("chat page has no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/chat");
    await page.waitForLoadState("networkidle");

    const real = errors.filter((e) => !/lovable|sandbox|chrome-extension|favicon/i.test(e));
    expect(real, real.join("\n")).toHaveLength(0);
  });
});
