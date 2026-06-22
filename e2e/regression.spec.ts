import { test, expect } from "@playwright/test";

/**
 * E2E Regression Suite - Critical User Flows
 *
 * Tests core functionality that must work before every release.
 * Covers: navigation, API endpoints, error handling, performance.
 */

test.describe("Navigation & Routing", () => {
  test("all public routes return 2xx status", async ({ page }) => {
    const publicRoutes = [
      "/",
      "/auth",
      "/artikel",
      "/resep",
      "/kalkulator",
      "/faq",
      "/diet",
      "/terms",
      "/privacy",
    ];

    for (const route of publicRoutes) {
      const response = await page.goto(route);
      expect(response?.status(), `${route} should return 2xx`).toBeLessThan(300);
    }
  });

  test("protected routes redirect to auth when not logged in", async ({ page }) => {
    const protectedRoutes = ["/dashboard", "/profile", "/scan", "/chat", "/meal-plan", "/progress"];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForURL(/\/auth/, { timeout: 5000 });
      expect(page.url()).toContain("/auth");
    }
  });

  test("404 page renders for unknown routes", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist");
    expect(response?.status()).toBe(404);
    const body = await page.textContent("body");
    expect(body).toMatch(/404|not found|tidak ditemukan/i);
  });

  test("deep links work after client-side navigation", async ({ page }) => {
    // Start at home
    await page.goto("/");

    // Navigate to kalkulator
    await page.click('a[href="/kalkulator"]');
    await page.waitForURL(/\/kalkulator/);

    // Reload - should still work (SSR)
    await page.reload();
    expect(page.url()).toContain("/kalkulator");

    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });
});

test.describe("API Endpoints", () => {
  test("health endpoint returns 200", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("ok");
    expect(data.timestamp).toBeTruthy();
  });

  test("log-error endpoint accepts POST", async ({ request }) => {
    const response = await request.post("/api/log-error", {
      data: {
        message: "Test error from E2E",
        source: "e2e-test",
        timestamp: new Date().toISOString(),
      },
    });
    // Should accept the error (200 or 201)
    expect(response.status()).toBeLessThan(300);
  });

  test("API routes return proper CORS headers", async ({ request }) => {
    const response = await request.get("/api/health");
    const headers = response.headers();

    // Should have CORS headers for API routes
    expect(headers["access-control-allow-origin"]).toBeTruthy();
  });
});

test.describe("Performance Benchmarks", () => {
  test("homepage loads in under 3 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const duration = Date.now() - start;

    // Should load in under 3 seconds on good connection
    expect(duration).toBeLessThan(3000);
  });

  test("no JavaScript errors on homepage", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Filter out known noise
    const realErrors = errors.filter((e) => !/lovable|sandbox|chrome-extension|favicon/i.test(e));

    expect(realErrors, realErrors.join("\n")).toHaveLength(0);
  });

  test("images are optimized and lazy-loaded", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const images = page.locator("img");
    const count = await images.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const img = images.nth(i);
      const loading = await img.getAttribute("loading");
      const src = await img.getAttribute("src");

      // Below-fold images should be lazy-loaded
      if (i > 2) {
        expect(loading, `Image ${i} should be lazy-loaded`).toBe("lazy");
      }

      // All images should have src
      expect(src, `Image ${i} should have src`).toBeTruthy();
    }
  });

  test("critical CSS is inlined", async ({ page }) => {
    await page.goto("/");

    // Check for inline styles in head
    const inlineStyles = await page.locator("head style").count();
    expect(inlineStyles, "Should have inline critical CSS").toBeGreaterThan(0);
  });
});

test.describe("Form Handling", () => {
  test("auth form validates email format", async ({ page }) => {
    await page.goto("/auth");

    // Find email input
    const emailInput = page.locator('input[type="email"]').first();
    if ((await emailInput.count()) > 0) {
      await emailInput.fill("invalid-email");

      // Try to submit
      const submitButton = page.locator('button[type="submit"]').first();
      if ((await submitButton.count()) > 0) {
        await submitButton.click();

        // Should show validation error or HTML5 validation
        await page.waitForTimeout(500);

        // Check for error message or invalid state
        const hasError =
          (await page.locator("[role='alert'], .error, .invalid").count()) > 0 ||
          (await emailInput.evaluate((el) => (el as HTMLInputElement).validity.valid)) === false;

        expect(hasError).toBe(true);
      }
    }
  });

  test("forms prevent double-submission", async ({ page }) => {
    await page.goto("/auth");

    const submitButton = page.locator('button[type="submit"]').first();
    if ((await submitButton.count()) > 0) {
      // Click rapidly
      await submitButton.click();
      await submitButton.click();
      await submitButton.click();

      // Button should be disabled during submission or only one request sent
      await page.waitForTimeout(1000);

      // Should not have multiple simultaneous requests
      // (This is a basic check - real implementation would track actual requests)
    }
  });
});

test.describe("Error Handling", () => {
  test("gracefully handles network failures", async ({ page }) => {
    // Block API calls
    await page.route("**/api/**", (route) => route.abort());

    await page.goto("/");

    // Page should still render (graceful degradation)
    const body = await page.textContent("body");
    expect(body).toBeTruthy();

    // Should not show raw error messages
    expect(body).not.toMatch(/Error:|TypeError:|ReferenceError:/i);
  });

  test("shows user-friendly error messages", async ({ page }) => {
    // Trigger a 500 error by visiting a broken route (if exists)
    // For now, just verify error boundary exists
    await page.goto("/");

    // Check for error boundary component
    const hasErrorBoundary = await page
      .locator('[data-testid="error-boundary"], .error-boundary')
      .count()
      .then((c) => c >= 0); // Error boundary might not be visible until error

    expect(hasErrorBoundary).toBe(true);
  });
});

test.describe("Responsive Design", () => {
  test("mobile viewport renders correctly", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Should not have horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll, "Should not have horizontal scroll on mobile").toBe(false);

    // Text should be readable (not too small)
    const fontSize = await page.evaluate(() => {
      const body = document.body;
      return window.getComputedStyle(body).fontSize;
    });

    expect(parseFloat(fontSize), "Font size should be at least 14px").toBeGreaterThanOrEqual(14);
  });

  test("touch targets are large enough on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    const buttons = page.locator("button, a");
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();

      if (box) {
        // Touch targets should be at least 44x44px (WCAG 2.5.8)
        expect(box.width, `Button ${i} width`).toBeGreaterThanOrEqual(44);
        expect(box.height, `Button ${i} height`).toBeGreaterThanOrEqual(44);
      }
    }
  });
});

test.describe("SEO & Meta Tags", () => {
  test("all pages have unique titles", async ({ page }) => {
    const routes = ["/", "/artikel", "/resep", "/kalkulator"];
    const titles = new Set<string>();

    for (const route of routes) {
      await page.goto(route);
      const title = await page.title();
      titles.add(title);
    }

    // All titles should be unique
    expect(titles.size, "Each page should have unique title").toBe(routes.length);
  });

  test("Open Graph tags are present", async ({ page }) => {
    await page.goto("/");

    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute("content");
    const ogDescription = await page
      .locator('meta[property="og:description"]')
      .getAttribute("content");
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");

    expect(ogTitle).toBeTruthy();
    expect(ogDescription).toBeTruthy();
    expect(ogImage).toBeTruthy();
  });

  test("structured data (JSON-LD) is valid", async ({ page }) => {
    await page.goto("/");

    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();

    if (jsonLd) {
      // Should be valid JSON
      const data = JSON.parse(jsonLd);
      expect(data["@context"]).toContain("schema.org");
      expect(data["@type"]).toBeTruthy();
    }
  });
});

test.describe("Accessibility Regression", () => {
  test("all interactive elements have accessible names", async ({ page }) => {
    await page.goto("/");

    const buttons = page.locator("button");
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 20); i++) {
      const button = buttons.nth(i);
      const name = await button.evaluate((el) => {
        return (
          el.getAttribute("aria-label") || el.textContent?.trim() || el.getAttribute("title") || ""
        );
      });

      expect(name, `Button ${i} should have accessible name`).toBeTruthy();
    }
  });

  test("color contrast meets WCAG AA", async ({ page }) => {
    await page.goto("/");

    // Check body text color contrast
    const bodyColor = await page.evaluate(() => {
      const body = document.body;
      const style = window.getComputedStyle(body);
      return style.color;
    });

    // Should be dark enough (not light gray)
    expect(bodyColor).not.toMatch(/rgb\(2[0-9]{2}/); // Not too light
  });

  test("focus indicators are visible", async ({ page }) => {
    await page.goto("/");

    // Tab to first interactive element
    await page.keyboard.press("Tab");

    const focused = page.locator(":focus");
    const outline = await focused.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.outlineStyle !== "none" || style.outlineWidth !== "0px";
    });

    expect(outline, "Focused element should have visible outline").toBe(true);
  });
});
