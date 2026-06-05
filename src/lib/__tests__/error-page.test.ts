import { describe, it, expect } from "vitest";
import { renderErrorPage } from "../error-page";

describe("renderErrorPage", () => {
  const html = renderErrorPage();
  it("starts with doctype and has html/head/body", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<html");
    expect(html).toContain("</body>");
  });
  it("includes viewport meta + title", () => {
    expect(html).toMatch(/<meta name="viewport"/);
    expect(html).toMatch(/<title>[^<]+<\/title>/);
  });
  it("includes retry + go home actions", () => {
    expect(html).toContain("location.reload()");
    expect(html).toContain('href="/"');
  });
});