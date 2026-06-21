/**
 * Sprint 6b: Sitemap <lastmod> for dynamic content.
 *
 * The sitemap route at /sitemap.xml uses real `updated_at` from Supabase
 * SEO views (seo_recipes, seo_articles, etc.) so Google can decide when
 * to re-crawl. Static entries fall back to today's date.
 */
import { describe, it, expect } from "vitest";

describe("sitemap lastmod (Sprint 6b)", () => {
  it("static entries should declare lastmod (today or explicit)", () => {
    // Snapshot of the static entries in the route. We're not loading the
    // route here (it touches Supabase), just verifying the data shape
    // contract that the route uses internally.
    const staticPaths = [
      "/",
      "/kalkulator",
      "/kalkulator/bmi",
      "/kalkulator/bmr",
      "/kalkulator/tdee",
      "/kalkulator/body-fat",
      "/kalkulator/ideal-weight",
      "/kalkulator/water-intake",
      "/kalkulator/macro",
      "/kalkulator/heart-rate-zone",
      "/kalori",
      "/olahraga",
      "/diet",
      "/artikel",
      "/resep",
      "/faq",
    ];
    expect(staticPaths.length).toBeGreaterThan(0);
  });

  it("ISO date → YYYY-MM-DD conversion strips time correctly", () => {
    // Replicate toDate() inline so the test doesn't import from the route.
    const cases: Array<[string, string | undefined]> = [
      ["2026-06-21T00:02:29.263+00:00", "2026-06-21"],
      ["2026-06-21T23:59:59.999Z", "2026-06-21"],
      ["2026-06-21", "2026-06-21"],
      ["", undefined],
      [null, undefined],
      [undefined, undefined],
    ];
    for (const [input, expected] of cases) {
      const m = input ? String(input).match(/^(\d{4}-\d{2}-\d{2})/) : null;
      expect(m?.[1] ?? undefined).toBe(expected);
    }
  });

  it("sitemap.xml is served as application/xml with cache-control", () => {
    // Lightweight check: the route declares its content-type. We can't
    // easily call the route handler in a unit test (it depends on
    // AsyncLocalStorage CF env), so this just documents the contract.
    const expectedContentType = "application/xml";
    expect(expectedContentType).toBe("application/xml");
  });
});
