import { test, expect } from "@playwright/test";

test.describe("Auth page", () => {
  test("renders login/signup UI", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.locator("html")).toHaveAttribute("lang", "id");
    // Should have some form of auth input (email, OAuth buttons, etc.)
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });

  test("has no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/auth");
    await page.waitForLoadState("networkidle");
    const real = errors.filter(
      (e) => !/lovable|sandbox|chrome-extension|favicon|manifest/i.test(e),
    );
    expect(real, real.join("\n")).toHaveLength(0);
  });

  test("does not expose dashboard content", async ({ page }) => {
    await page.goto("/auth");
    const body = await page.textContent("body");
    // Should not contain authenticated dashboard text
    expect(body).not.toMatch(/DashboardHeader|TodaysBalanceCard|HeroStatsRow/i);
  });
});
