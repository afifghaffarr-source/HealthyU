import { test, expect } from "@playwright/test";

test.describe("Security headers", () => {
  test("HTML responses have security headers", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();

    // CSP present
    expect(h["content-security-policy"]).toBeTruthy();

    // X-Content-Type-Options
    expect(h["x-content-type-options"]).toBe("nosniff");

    // Referrer-Policy
    expect(h["referrer-policy"]).toBeTruthy();

    // HSTS (may not be present in dev, but check if exists)
    if (h["strict-transport-security"]) {
      expect(h["strict-transport-security"]).toContain("max-age");
    }
  });

  test("API routes are protected (no open proxy)", async ({ request }) => {
    // /api/chat.stream should require auth
    const chatRes = await request.post("/api/chat.stream", {
      data: { message: "test" },
    });
    // Should be 401 (unauthorized) or 400 (bad request), NOT 200
    expect(chatRes.status()).toBeGreaterThanOrEqual(400);
  });

  test("cron hooks require secret", async ({ request }) => {
    // /api/public/hooks/daily-coach without secret should fail
    const res = await request.post("/api/public/hooks/daily-coach");
    // Should be 401 (unauthorized)
    expect(res.status()).toBe(401);
  });

  test("image proxy blocks non-allowlisted hosts", async ({ request }) => {
    // /api/img should reject arbitrary URLs
    const res = await request.get("/api/img/https://evil.com/image.jpg");
    // Should be 403 (forbidden)
    expect(res.status()).toBe(403);
  });

  test("protected routes redirect to auth", async ({ page }) => {
    const protectedRoutes = ["/dashboard", "/profile", "/chat", "/scan"];
    for (const path of protectedRoutes) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/auth/);
    }
  });
});
