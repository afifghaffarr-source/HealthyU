import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { initWebVitals } from "../webVitals";

// Mock web-vitals at the module level so we can control the metric callbacks
// without actually running the PerformanceObserver. We use a manual mock
// (not vi.mock) to avoid auto-mock path issues with web-vitals ESM.
const metricHandlers: Array<(m: unknown) => void> = [];

vi.mock("web-vitals", () => ({
  onCLS: (cb: (m: unknown) => void) => metricHandlers.push(cb),
  onINP: (cb: (m: unknown) => void) => metricHandlers.push(cb),
  onLCP: (cb: (m: unknown) => void) => metricHandlers.push(cb),
  onFCP: (cb: (m: unknown) => void) => metricHandlers.push(cb),
  onTTFB: (cb: (m: unknown) => void) => metricHandlers.push(cb),
}));

const originalFetch = globalThis.fetch;

beforeEach(() => {
  metricHandlers.length = 0;
  globalThis.fetch = vi.fn().mockResolvedValue(new Response("ok"));
  // Reset module-internal `initialized` flag by clearing module cache.
  vi.resetModules();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

async function fireMetric(
  rating: "good" | "needs-improvement" | "poor",
  name = "LCP",
  value = 3000,
) {
  const mod = await import("../webVitals");
  mod.initWebVitals();
  // Wait one tick for the handlers to be registered
  await Promise.resolve();
  // Find the handler that corresponds to this metric name
  // All handlers in our mock are added in order: CLS, INP, LCP, FCP, TTFB.
  // We just simulate each handler by calling them with a fake metric.
  for (const handler of metricHandlers) {
    handler({ name, value, rating, id: "test-id", navigationType: "navigate" });
  }
  // Give the fire-and-forget fetch a tick
  await Promise.resolve();
  await Promise.resolve();
}

describe("initWebVitals", () => {
  it("initializes only once across multiple calls (idempotent)", async () => {
    vi.stubEnv("DEV", false);
    const mod = await import("../webVitals");
    mod.initWebVitals();
    mod.initWebVitals();
    mod.initWebVitals();
    await Promise.resolve();
    // 5 on*() calls per initWebVitals — but only first call should register.
    expect(metricHandlers.length).toBe(5);
  });

  it("does NOT register handlers in SSR (no window)", async () => {
    const originalWindow = globalThis.window;
    delete (globalThis as { window?: unknown }).window;
    const mod = await import("../webVitals");
    mod.initWebVitals();
    await Promise.resolve();
    expect(metricHandlers.length).toBe(0);
    globalThis.window = originalWindow;
  });

  it("does NOT report 'good' metrics (avoids noise)", async () => {
    vi.stubEnv("DEV", false);
    await fireMetric("good", "LCP", 1500);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("reports 'needs-improvement' metrics as warnings", async () => {
    vi.stubEnv("DEV", false);
    await fireMetric("needs-improvement", "LCP", 3000);
    expect(globalThis.fetch).toHaveBeenCalledTimes(5); // 5 handlers × 1 metric each
    // Every fetched payload should have severity: "warning" since rating was "needs-improvement"
    for (const call of (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls) {
      const [url, init] = call;
      expect(url).toBe("/api/log-error");
      const body = JSON.parse(init.body);
      expect(body.severity).toBe("warning");
      expect(body.source).toBe("web-vitals");
      expect(body.context.metric_rating).toBe("needs-improvement");
      expect(body.context.metric_value).toBe(3000);
    }
  });

  it("reports 'poor' metrics as errors", async () => {
    vi.stubEnv("DEV", false);
    await fireMetric("poor", "CLS", 0.4);
    expect(globalThis.fetch).toHaveBeenCalled();
    const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.severity).toBe("error");
    expect(body.context.metric_rating).toBe("poor");
  });

  it("does NOT report anything in DEV (same as reportError)", async () => {
    vi.stubEnv("DEV", true);
    await fireMetric("poor", "LCP", 5000);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
