import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabaseAdmin chain for enforceAiBudget tests.
const mockState = {
  hourCount: 0,
  dayRows: [] as { total_tokens: number }[],
  inserted: [] as unknown[],
};

vi.mock("@/integrations/supabase/client.server", () => {
  function builder() {
    const chain: Record<string, unknown> = {};
    chain.select = (_sel: string, opts?: { count?: string; head?: boolean }) => {
      if (opts?.head) {
        // hour count branch
        return {
          eq: () => ({
            eq: () => ({ gte: () => Promise.resolve({ count: mockState.hourCount, data: null }) }),
          }),
        };
      }
      // day tokens branch
      return {
        eq: () => ({
          eq: () => ({ gte: () => Promise.resolve({ data: mockState.dayRows, count: null }) }),
        }),
      };
    };
    chain.insert = (row: unknown) => {
      mockState.inserted.push(row);
      return Promise.resolve({ data: null, error: null });
    };
    return chain;
  }
  return {
    supabaseAdmin: {
      from: () => builder(),
    },
  };
});

import { estimateCost, enforceAiBudget, logAiUsage } from "../aiBudget.server";

describe("estimateCost", () => {
  it("uses model price when known", () => {
    // flash: in 0.000075, out 0.0003 per 1k
    expect(estimateCost("google/gemini-2.5-flash", 1000, 1000)).toBeCloseTo(0.000375, 6);
  });
  it("falls back to default for unknown model", () => {
    expect(estimateCost("unknown/model", 1000, 1000)).toBeCloseTo(0.0004, 6);
  });
  it("zero tokens -> zero cost", () => {
    expect(estimateCost("google/gemini-2.5-pro", 0, 0)).toBe(0);
  });
});

describe("enforceAiBudget", () => {
  beforeEach(() => {
    mockState.hourCount = 0;
    mockState.dayRows = [];
    mockState.inserted = [];
  });

  it("allowed when under all limits", async () => {
    const r = await enforceAiBudget("u1", false);
    expect(r).toEqual({ allowed: true, shouldDowngrade: false });
  });

  it("free tier blocks at 10 req/hour", async () => {
    mockState.hourCount = 10;
    const r = await enforceAiBudget("u1", false);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("rate_hour");
    expect(r.retryAfterSec).toBe(3600);
  });

  it("free tier blocks at 10k tokens/day", async () => {
    mockState.dayRows = [{ total_tokens: 5000 }, { total_tokens: 5000 }];
    const r = await enforceAiBudget("u1", false);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("token_day");
    expect(r.retryAfterSec).toBe(86400);
  });

  it("premium raises limits to 50 / 50k", async () => {
    mockState.hourCount = 20;
    mockState.dayRows = [{ total_tokens: 20_000 }];
    const r = await enforceAiBudget("u1", true);
    expect(r.allowed).toBe(true);
  });

  it("shouldDowngrade when ≥80% of hourly limit", async () => {
    mockState.hourCount = 8; // 80% of 10
    const r = await enforceAiBudget("u1", false);
    expect(r).toEqual({ allowed: true, shouldDowngrade: true });
  });
});

describe("logAiUsage", () => {
  beforeEach(() => {
    mockState.inserted = [];
  });
  it("inserts log with computed cost", async () => {
    await logAiUsage({
      userId: "u1",
      feature: "chat",
      model: "google/gemini-2.5-flash",
      promptTokens: 1000,
      completionTokens: 500,
    });
    expect(mockState.inserted).toHaveLength(1);
    const row = mockState.inserted[0] as Record<string, unknown>;
    expect(row.total_tokens).toBe(1500);
    expect(row.cache_hit).toBe(false);
    expect(row.cost_usd).toBeGreaterThan(0);
  });
  it("cache_hit -> zero cost", async () => {
    await logAiUsage({
      userId: "u1",
      feature: "chat",
      model: "google/gemini-2.5-flash",
      promptTokens: 1000,
      completionTokens: 500,
      cacheHit: true,
    });
    const row = mockState.inserted[0] as Record<string, unknown>;
    expect(row.cost_usd).toBe(0);
    expect(row.cache_hit).toBe(true);
  });
});