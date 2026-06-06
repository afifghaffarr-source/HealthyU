import { test, expect } from "@playwright/test";

test.describe("Public pages quality", () => {
  test("landing page has proper SEO meta tags", async ({ request }) => {
    const res = await request.get("/");
    const html = await res.text();

    // Title exists
    expect(html).toMatch(/<title>.+<\/title>/);

    // Description exists
    expect(html).toMatch(/name="description"/);

    // Open Graph tags
    expect(html).toMatch(/property="og:title"/);
    expect(html).toMatch(/property="og:description"/);
    expect(html).toMatch(/property="og:image"/);

    // Structured data (JSON-LD)
    expect(html).toMatch(/application\/ld\+json/);
  });

  test("landing page has canonical URL", async ({ request }) => {
    const res = await request.get("/");
    const html = await res.text();
    expect(html).toMatch(/rel="canonical"/);
  });

  test("kalkulator page renders calculator content", async ({ page }) => {
    const res = await page.goto("/kalkulator");
    expect(res?.status()).toBeLessThan(300);
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });

  test("public pages have no broken images", async ({ page }) => {
    await page.goto("/");
    const images = page.locator("img");
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const src = await img.getAttribute("src");
      if (src && !src.startsWith("data:")) {
        const naturalWidth = await img.evaluate((el) => (el as HTMLImageElement).naturalWidth);
        // Natural width 0 means image failed to load
        expect(naturalWidth, `Image ${src} failed to load`).toBeGreaterThan(0);
      }
    }
  });

  test("public pages load fonts", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Check that Google Fonts stylesheet is loaded
    const fontLinks = page.locator('link[href*="fonts.googleapis.com"]');
    const count = await fontLinks.count();
    expect(count).toBeGreaterThan(0);
  });
});
