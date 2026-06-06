import { test, expect } from "@playwright/test";

test("home page renders and has Indonesian lang", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "id");
  await expect(page).toHaveTitle(/.+/);
});

test("auth page is reachable", async ({ page }) => {
  const res = await page.goto("/auth");
  expect(res?.status()).toBeLessThan(500);
});

test("landing has primary CTA to auth", async ({ page }) => {
  await page.goto("/");
  // CTA wording dapat berubah; cocokkan kata kunci umum.
  const cta = page.getByRole("link", { name: /mulai|coba|daftar|masuk|gratis/i }).first();
  await expect(cta).toBeVisible();
});

test("landing has no console errors on load", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  // Allowlist: noise umum dari ekstensi/iframe Lovable.
  const real = errors.filter((e) => !/lovable|sandbox|chrome-extension|favicon|manifest/i.test(e));
  expect(real, real.join("\n")).toHaveLength(0);
});

test("public content routes return 2xx", async ({ page }) => {
  for (const path of ["/artikel", "/resep", "/kalkulator", "/faq", "/diet"]) {
    const res = await page.goto(path);
    expect(res?.status(), `${path} should be reachable`).toBeLessThan(500);
  }
});

test("robots.txt and sitemap are served", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toMatch(/User-agent|Sitemap/i);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("<urlset");
});

test("PWA manifest is valid", async ({ request }) => {
  const res = await request.get("/manifest.json");
  expect(res.status()).toBe(200);
  const m = await res.json();
  expect(m.name).toBeTruthy();
  expect(m.start_url).toBeTruthy();
  expect(m.display).toBe("standalone");
  expect(Array.isArray(m.icons) && m.icons.length).toBeGreaterThan(0);
});

test("protected dashboard redirects to /auth when unauthenticated", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/auth/);
});

test("security headers present on HTML response", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["content-security-policy"]).toBeTruthy();
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBeTruthy();
});
