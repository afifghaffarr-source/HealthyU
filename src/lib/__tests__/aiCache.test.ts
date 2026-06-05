import { describe, it, expect, vi, beforeEach } from "vitest";

const maybeSingle = vi.fn();
const upsert = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle }) }),
      upsert,
    }),
  },
}));

import { cacheKey, getCached, setCached } from "@/features/ai/lib/aiCache.server";

beforeEach(() => {
  maybeSingle.mockReset();
  upsert.mockClear();
});

describe("cacheKey", () => {
  it("is deterministic and 64-char hex", async () => {
    const a = await cacheKey({ model: "m", tier: 2, question: "Hello  World", profileHash: "p" });
    const b = await cacheKey({ model: "m", tier: 2, question: "hello world", profileHash: "p" });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs by tier", async () => {
    const a = await cacheKey({ model: "m", tier: 2, question: "q", profileHash: "p" });
    const b = await cacheKey({ model: "m", tier: 3, question: "q", profileHash: "p" });
    expect(a).not.toBe(b);
  });
});

describe("getCached", () => {
  it("returns null when not found", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    expect(await getCached("k")).toBeNull();
  });

  it("returns null when expired", async () => {
    maybeSingle.mockResolvedValue({ data: { response: "r", expires_at: new Date(Date.now() - 1000).toISOString() } });
    expect(await getCached("k")).toBeNull();
  });

  it("returns response when fresh", async () => {
    maybeSingle.mockResolvedValue({ data: { response: "hi", expires_at: new Date(Date.now() + 60_000).toISOString() } });
    expect(await getCached("k")).toBe("hi");
  });
});

describe("setCached", () => {
  it("uses 24h TTL for tier 2 non-personal", async () => {
    await setCached({ key: "k", response: "r", model: "m", tier: 2, isPersonal: false });
    const row = upsert.mock.calls[0][0];
    const ttl = new Date(row.expires_at).getTime() - Date.now();
    expect(ttl).toBeGreaterThan(23 * 3600_000);
    expect(ttl).toBeLessThanOrEqual(24 * 3600_000 + 1000);
  });

  it("uses 1h TTL for tier >= 3 or personal", async () => {
    await setCached({ key: "k", response: "r", model: "m", tier: 3, isPersonal: false });
    const ttl = new Date(upsert.mock.calls[0][0].expires_at).getTime() - Date.now();
    expect(ttl).toBeLessThanOrEqual(3600_000 + 1000);

    await setCached({ key: "k", response: "r", model: "m", tier: 2, isPersonal: true });
    const ttl2 = new Date(upsert.mock.calls[1][0].expires_at).getTime() - Date.now();
    expect(ttl2).toBeLessThanOrEqual(3600_000 + 1000);
  });
});