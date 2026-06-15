import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.E2E_BASE_URL || "http://localhost:8080";

/**
 * Mock Supabase + VexoAPI so auth/scan pages render their real UI
 * (otherwise the root-level <AuthListener> triggers supabase.auth.onAuthStateChange
 * which throws when the project doesn't exist, caught by TanStack error boundary
 * and replaced with a "Coba lagi" fallback containing no <main>).
 */
async function mockExternalApis(page: Page) {
  await page.route("**/test.supabase.co/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: {}, error: null }),
    }),
  );
  await page.route("**/test.vexoapi.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    }),
  );
  await page.route("**/vexoapi.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    }),
  );
}

const ROUTES_TO_TEST = ["/", "/auth", "/scan"] as const;

for (const route of ROUTES_TO_TEST) {
  test(`${route} passes WCAG 2.1 AA a11y (color-contrast, landmark, region)`, async ({ page }) => {
    await mockExternalApis(page);
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);

    // Sanity: page should NOT be the error fallback
    const isFallback = await page.evaluate(
      () =>
        /coba lagi|try again/i.test(document.body?.textContent || "") &&
        document.querySelectorAll("main").length === 0,
    );
    expect(isFallback, `${route} is rendering error fallback, not real UI`).toBe(false);

    // Sanity: at least one <main>
    const mainCount = await page.locator("main").count();
    expect(mainCount, `${route} should have <main>`).toBeGreaterThan(0);

    // axe scan (valid-source-maps is a Lighthouse rule, not axe — filter manually)
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const violations = results.violations.filter((v) => v.id !== "valid-source-maps");

    // Report violations for visibility
    if (violations.length) {
      console.log(
        `${route} violations:`,
        results.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.length,
          help: v.help,
        })),
      );
    }

    expect(
      violations,
      `${route} has ${violations.length} a11y violation(s):\n${JSON.stringify(
        violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.slice(0, 2).map((n) => ({
            target: n.target,
            failureSummary: n.failureSummary,
          })),
        })),
        null,
        2,
      )}`,
    ).toEqual([]);
  });
}
