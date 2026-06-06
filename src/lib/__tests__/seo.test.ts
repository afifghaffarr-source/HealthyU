import { describe, it, expect } from "vitest";
import { canonical, ogImage, SITE_URL } from "../seo";

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
