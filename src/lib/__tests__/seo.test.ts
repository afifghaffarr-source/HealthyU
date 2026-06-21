import { describe, it, expect } from "vitest";
import {
  canonical,
  ogImage,
  hreflangAlternates,
  HREFLANG_VARIANTS,
  SITE_LOCALE,
  SITE_URL,
} from "../seo";

describe("canonical", () => {
  it("returns SITE_URL alone for '/'", () => {
    expect(canonical("/")).toBe(SITE_URL);
  });
  it("prepends slash when missing", () => {
    expect(canonical("about")).toBe(`${SITE_URL}/about`);
  });
  it("keeps existing slash", () => {
    expect(canonical("/articles/hello")).toBe(`${SITE_URL}/articles/hello`);
  });
});

describe("ogImage", () => {
  it("defaults to /icon-512.svg", () => {
    expect(ogImage()).toBe(`${SITE_URL}/icon-512.svg`);
  });
  it("uses custom path", () => {
    expect(ogImage("/og.png")).toBe(`${SITE_URL}/og.png`);
  });
});

describe("SITE_LOCALE", () => {
  it("is id-ID (Indonesian — Indonesia)", () => {
    expect(SITE_LOCALE).toBe("id-ID");
  });
});

describe("HREFLANG_VARIANTS", () => {
  it("contains at least one variant", () => {
    expect(HREFLANG_VARIANTS.length).toBeGreaterThan(0);
  });
  it("includes id-ID", () => {
    expect(HREFLANG_VARIANTS).toContain("id-ID");
  });
});

describe("hreflangAlternates", () => {
  it("returns id-ID + x-default for a path", () => {
    const links = hreflangAlternates("/resep/oatmeal");
    expect(links).toHaveLength(HREFLANG_VARIANTS.length + 1);
    const hreflangs = links.map((l) => l.hreflang);
    expect(hreflangs).toContain("id-ID");
    expect(hreflangs).toContain("x-default");
  });

  it("uses canonical URL for every variant", () => {
    const links = hreflangAlternates("/resep/oatmeal");
    const expected = `${SITE_URL}/resep/oatmeal`;
    for (const link of links) {
      expect(link.href).toBe(expected);
    }
  });

  it("uses rel=alternate on every entry", () => {
    const links = hreflangAlternates("/");
    for (const link of links) {
      expect(link.rel).toBe("alternate");
    }
  });

  it("works for the homepage path", () => {
    const links = hreflangAlternates("/");
    expect(links).toHaveLength(HREFLANG_VARIANTS.length + 1);
    for (const link of links) {
      expect(link.href).toBe(SITE_URL);
    }
  });

  it("works for nested paths", () => {
    const links = hreflangAlternates("/artikel/panduan-diet/x");
    for (const link of links) {
      expect(link.href).toBe(`${SITE_URL}/artikel/panduan-diet/x`);
    }
  });

  it("accepts paths without leading slash (auto-prepends)", () => {
    const links = hreflangAlternates("resep/oatmeal");
    for (const link of links) {
      expect(link.href).toBe(`${SITE_URL}/resep/oatmeal`);
    }
  });
});
