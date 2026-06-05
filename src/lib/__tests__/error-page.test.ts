import { describe, it, expect } from "vitest";
import { renderErrorPage } from "../error-page";

describe("renderErrorPage", () => {
  const html = renderErrorPage();
  it("returns a complete HTML doc", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<html lang=\"en\">");
    expect(html).toContain("</html>");
  });
  it("has viewport meta and title", () => {
    expect(html).toContain('name="viewport"');
    expect(html).toContain("<title>This page didn't load</title>");
  });
  it("has Try again + Go home actions", () => {
    expect(html).toContain("Try again");
    expect(html).toMatch(/href="\/"/);
    expect(html).toContain("location.reload()");
  });
});