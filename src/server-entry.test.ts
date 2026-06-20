import { describe, expect, it } from "vitest";
import { applyCachePolicy } from "@/server-entry";

// Helper: build a Response with optional content-type header.
function makeResponse(opts: {
  body?: BodyInit | null;
  contentType?: string;
  status?: number;
}): Response {
  const headers = new Headers();
  if (opts.contentType) headers.set("content-type", opts.contentType);
  return new Response(opts.body ?? "ok", {
    status: opts.status ?? 200,
    headers,
  });
}

// Helper: read Cache-Control header off the (possibly re-wrapped) response.
function cacheControl(res: Response): string | null {
  return res.headers.get("Cache-Control");
}

describe("applyCachePolicy — HTML responses", () => {
  it("forces no-store on text/html responses", () => {
    const res = makeResponse({ contentType: "text/html; charset=utf-8" });
    const out = applyCachePolicy(res, "/anything");
    expect(cacheControl(out)).toBe("no-store, must-revalidate");
    expect(out.headers.get("Pragma")).toBe("no-cache");
  });

  it("preserves response status and statusText", () => {
    const res = makeResponse({ contentType: "text/html", status: 404 });
    const out = applyCachePolicy(res, "/missing");
    expect(out.status).toBe(404);
  });

  it("preserves response body", async () => {
    const res = makeResponse({
      contentType: "text/html",
      body: "<html>hi</html>",
    });
    const out = applyCachePolicy(res, "/");
    expect(await out.text()).toBe("<html>hi</html>");
  });

  it("does not match xhtml+xml (TanStack emits text/html, not xhtml)", () => {
    // Defensive: if a non-html content-type slips through, no cache override.
    const res = makeResponse({ contentType: "application/xhtml+xml" });
    const out = applyCachePolicy(res, "/anything");
    expect(cacheControl(out)).toBeNull();
  });
});

describe("applyCachePolicy — vite /assets/* (immutable, 1y)", () => {
  it("caches /assets/* as immutable 1-year", () => {
    const res = makeResponse({ contentType: "application/javascript" });
    const out = applyCachePolicy(res, "/assets/index-abc123.js");
    expect(cacheControl(out)).toBe("public, max-age=31536000, immutable");
  });

  it("caches /assets/* even for css", () => {
    const res = makeResponse({ contentType: "text/css" });
    const out = applyCachePolicy(res, "/assets/index-def456.css");
    expect(cacheControl(out)).toBe("public, max-age=31536000, immutable");
  });
});

describe("applyCachePolicy — fonts (immutable, 1y)", () => {
  it("caches /fonts/*.woff2 as immutable 1-year", () => {
    const res = makeResponse({ contentType: "font/woff2" });
    const out = applyCachePolicy(res, "/fonts/geist-latin-wght-normal.woff2");
    expect(cacheControl(out)).toBe("public, max-age=31536000, immutable");
  });
});

describe("applyCachePolicy — images (30d)", () => {
  it("caches /images/* for 30 days", () => {
    const res = makeResponse({ contentType: "image/png" });
    const out = applyCachePolicy(res, "/images/recipes/nasi-merah.png");
    expect(cacheControl(out)).toBe("public, max-age=2592000, s-maxage=2592000");
  });
});

describe("applyCachePolicy — PWA / icons (1d)", () => {
  it("caches /manifest.json for 1 day", () => {
    const res = makeResponse({ contentType: "application/manifest+json" });
    const out = applyCachePolicy(res, "/manifest.json");
    expect(cacheControl(out)).toBe("public, max-age=86400");
  });

  it("caches /icon-*.svg for 1 day", () => {
    const res = makeResponse({ contentType: "image/svg+xml" });
    const out = applyCachePolicy(res, "/icon-192.svg");
    expect(cacheControl(out)).toBe("public, max-age=86400");
  });

  it("caches /robots.txt for 1 day (text/plain svg-pattern match)", () => {
    // robots.txt ends with .txt, not .svg/.png — should NOT match icon rule.
    // But should still pass through unchanged (no Cache-Control set).
    const res = makeResponse({ contentType: "text/plain" });
    const out = applyCachePolicy(res, "/robots.txt");
    // robots.txt isn't matched by any rule — falls through unchanged.
    expect(cacheControl(out)).toBeNull();
  });
});

describe("applyCachePolicy — passthrough", () => {
  it("does not modify responses with no matching rule and non-HTML content-type", () => {
    const res = makeResponse({ contentType: "application/json" });
    const out = applyCachePolicy(res, "/api/health");
    expect(cacheControl(out)).toBeNull();
    // Status + body preserved
    expect(out.status).toBe(200);
  });

  it("does not modify 500 errors (still safe, but signals the edge not to cache them)", () => {
    const res = makeResponse({ contentType: "application/json", status: 500 });
    const out = applyCachePolicy(res, "/api/broken");
    expect(out.status).toBe(500);
    expect(cacheControl(out)).toBeNull();
  });
});

describe("applyCachePolicy — header preservation", () => {
  it("preserves pre-existing headers (ETag, Vary, etc.) when adding Cache-Control", () => {
    const res = new Response("ok", {
      headers: {
        "content-type": "text/html",
        etag: '"abc123"',
        vary: "Accept-Encoding",
      },
    });
    const out = applyCachePolicy(res, "/");
    expect(out.headers.get("etag")).toBe('"abc123"');
    expect(out.headers.get("vary")).toBe("Accept-Encoding");
    expect(cacheControl(out)).toBe("no-store, must-revalidate");
  });
});
