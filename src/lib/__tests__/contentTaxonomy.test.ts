import { describe, it, expect, vi, beforeEach } from "vitest";

const orderMock = vi.fn();
const limitMock = vi.fn();
const eqMock = vi.fn();
const selectMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: unknown[]) => fromMock(...a) },
}));

import { listCategories, listTopTags } from "../contentTaxonomy.functions";

function buildCategoriesChain(result: { data: unknown; error: unknown }) {
  // .from(t).select().eq().order().order() -> result
  const order2 = vi.fn().mockResolvedValue(result);
  const order1 = vi.fn().mockReturnValue({ order: order2 });
  const eq = vi.fn().mockReturnValue({ order: order1 });
  const select = vi.fn().mockReturnValue({ eq });
  fromMock.mockReturnValueOnce({ select });
  return { select, eq, order1, order2 };
}

function buildTagsChain(result: { data: unknown; error: unknown }) {
  // .from(t).select().eq().order().limit() -> result
  const limit = vi.fn().mockResolvedValue(result);
  const order = vi.fn().mockReturnValue({ limit });
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  fromMock.mockReturnValueOnce({ select });
  return { select, eq, order, limit };
}

beforeEach(() => {
  fromMock.mockReset();
  orderMock.mockReset();
  limitMock.mockReset();
  eqMock.mockReset();
  selectMock.mockReset();
});

describe("listCategories", () => {
  it("returns categories on success", async () => {
    buildCategoriesChain({ data: [{ slug: "fit" }], error: null });
    const res = await listCategories();
    expect(res).toEqual({ categories: [{ slug: "fit" }] });
  });

  it("returns empty array when data null", async () => {
    buildCategoriesChain({ data: null, error: null });
    const res = await listCategories();
    expect(res.categories).toEqual([]);
  });

  it("throws on supabase error", async () => {
    buildCategoriesChain({ data: null, error: { message: "boom" } });
    await expect(listCategories()).rejects.toThrow("boom");
  });
});

describe("listTopTags", () => {
  it("defaults limit to 50 and returns tags", async () => {
    const chain = buildTagsChain({ data: [{ slug: "a" }], error: null });
    const res = await listTopTags({ data: undefined });
    expect(res.tags).toEqual([{ slug: "a" }]);
    expect(chain.limit).toHaveBeenCalledWith(50);
  });

  it("caps limit at 200", async () => {
    const chain = buildTagsChain({ data: [], error: null });
    await listTopTags({ data: { limit: 9999 } });
    expect(chain.limit).toHaveBeenCalledWith(200);
  });

  it("forwards custom limit", async () => {
    const chain = buildTagsChain({ data: [], error: null });
    await listTopTags({ data: { limit: 7 } });
    expect(chain.limit).toHaveBeenCalledWith(7);
  });

  it("throws on error", async () => {
    buildTagsChain({ data: null, error: { message: "nope" } });
    await expect(listTopTags({ data: { limit: 10 } })).rejects.toThrow("nope");
  });
});