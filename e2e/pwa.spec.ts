import { test, expect } from "@playwright/test";

test.describe("PWA features", () => {
  test("manifest.json has required fields", async ({ request }) => {
    const res = await request.get("/manifest.json");
    expect(res.status()).toBe(200);
    const m = await res.json();

    expect(m.name).toBeTruthy();
    expect(m.short_name).toBeTruthy();
    expect(m.start_url).toBeTruthy();
    expect(m.display).toBe("standalone");
    expect(m.lang).toBe("id-ID");
    expect(m.categories).toContain("health");
    expect(Array.isArray(m.icons) && m.icons.length).toBeGreaterThanOrEqual(2);

    // Check icon sizes
    const iconSizes = m.icons.map((i: { sizes?: string }) => i.sizes);
    expect(iconSizes.some((s: string) => s?.includes("192"))).toBe(true);
    expect(iconSizes.some((s: string) => s?.includes("512"))).toBe(true);
  });

  test("service worker is accessible", async ({ request }) => {
    const res = await request.get("/push-sw.js");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("push");
  });

  test("robots.txt disallows protected routes", async ({ request }) => {
    const res = await request.get("/robots.txt");
    const text = await res.text();
    expect(text).toContain("Disallow: /api/");
    expect(text).toContain("Disallow: /_authenticated/");
    expect(text).toContain("Sitemap:");
  });

  test("sitemap.xml is valid XML", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("<?xml");
    expect(text).toContain("<urlset");
    expect(text).toContain("https://healthyu.id");
  });
});
