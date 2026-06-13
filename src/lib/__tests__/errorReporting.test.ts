import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reportError, reportLovableError } from "../errorReporting";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = vi.fn().mockResolvedValue(new Response("ok"));
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("reportError", () => {
  it("calls POST /api/log-error in production with the error payload", async () => {
    vi.stubEnv("DEV", false);
    const err = new Error("boom");
    reportError(err, { boundary: "react_error_boundary", extra: "v" });
    // give microtask queue a tick
    await Promise.resolve();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/log-error");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.message).toBe("boom");
    expect(body.boundary).toBe("react_error_boundary");
    expect(body.severity).toBe("error");
    expect(body.context.extra).toBe("v");
    vi.unstubAllEnvs();
  });

  it("does NOT call fetch in DEV (avoids flooding the table while iterating)", () => {
    vi.stubEnv("DEV", true);
    reportError(new Error("x"));
    expect(globalThis.fetch).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it("never throws when fetch rejects", async () => {
    vi.stubEnv("DEV", false);
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("net"));
    expect(() => reportError(new Error("x"))).not.toThrow();
    await Promise.resolve();
    vi.unstubAllEnvs();
  });

  it("never throws when payload is non-Error", () => {
    vi.stubEnv("DEV", true);
    expect(() => reportError("plain string")).not.toThrow();
    expect(() => reportError({ weird: true })).not.toThrow();
    vi.unstubAllEnvs();
  });

  it("truncates oversized message to 2000 chars in the request body", async () => {
    vi.stubEnv("DEV", false);
    const huge = "x".repeat(5000);
    reportError(huge);
    await Promise.resolve();
    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.message.length).toBe(5000); // server truncates, not client
    expect(body.message.startsWith("x")).toBe(true);
    vi.unstubAllEnvs();
  });
});

describe("reportLovableError (legacy alias)", () => {
  it("is the same function as reportError", () => {
    expect(reportLovableError).toBe(reportError);
  });
});
