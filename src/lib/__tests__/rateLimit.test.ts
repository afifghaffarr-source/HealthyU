import { describe, it, expect, vi } from "vitest";
import { checkRateLimit, RATE_LIMITS } from "../rateLimit.server";

function client(rpcResult: { data?: unknown; error?: unknown }) {
  return { rpc: vi.fn().mockResolvedValue(rpcResult) } as unknown as Parameters<
    typeof checkRateLimit
  >[0] & { rpc: ReturnType<typeof vi.fn> };
}

describe("checkRateLimit", () => {
  it("calls RPC with bucket/max/window", async () => {
    const c = client({ data: true });
    await checkRateLimit(c, "chat", 10, 60);
    expect(c.rpc).toHaveBeenCalledWith("check_rate_limit", {
      _bucket: "chat",
      _max_requests: 10,
      _window_seconds: 60,
    });
  });
  it("returns true on data=true", async () => {
    expect(await checkRateLimit(client({ data: true }), "b", 1, 1)).toBe(true);
  });
  it("returns false on data=false", async () => {
    expect(await checkRateLimit(client({ data: false }), "b", 1, 1)).toBe(false);
  });
  it("fails closed on RPC error by default", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await checkRateLimit(client({ error: { message: "x" } }), "b", 1, 1)).toBe(false);
    spy.mockRestore();
  });
  it("fails open on RPC error when failOpen=true", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      await checkRateLimit(client({ error: { message: "x" } }), "b", 1, 1, { failOpen: true }),
    ).toBe(true);
    spy.mockRestore();
  });
});

describe("RATE_LIMITS presets", () => {
  it("has known buckets with sane values", () => {
    expect(RATE_LIMITS.chat).toEqual({ bucket: "chat", max: 30, windowSec: 60 });
    expect(RATE_LIMITS.report.windowSec).toBe(86400);
    for (const v of Object.values(RATE_LIMITS)) {
      expect(v.max).toBeGreaterThan(0);
      expect(v.windowSec).toBeGreaterThan(0);
    }
  });
});
