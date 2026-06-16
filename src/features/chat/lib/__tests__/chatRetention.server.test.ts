import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for the on-write retention enforcement. The function uses
 * a dynamic import for supabaseAdmin, so we mock the whole
 * integrations module before import.
 */

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  // supabaseAdmin RPC chain
  adminRpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: mocks.adminRpc,
  },
}));

import {
  getChatRetention,
  setChatRetention,
  enforceRetentionAfterWrite,
} from "../chatRetention.server";

function makeSupabase(profileDays: number | null = null) {
  // Chain: .from().select().eq().maybeSingle()
  const maybeSingle = mocks.maybeSingle.mockResolvedValue({
    data: profileDays === null ? null : { chat_retention_days: profileDays },
    error: null,
  });
  const eq = mocks.eq.mockReturnValue({ maybeSingle });
  const select = mocks.select.mockReturnValue({ eq });
  // .update().eq() — return { error }
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq: updateEq });
  // .from() returns BOTH select and update (Supabase builder pattern)
  const from = vi.fn().mockReturnValue({ select, update });
  return {
    from,
    __updateEq: updateEq,
  } as unknown as Parameters<typeof getChatRetention>[0];
}

describe("getChatRetention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for user with no retention set", async () => {
    const supabase = makeSupabase(null);
    const result = await getChatRetention(supabase, "user-1");
    expect(result).toBeNull();
  });

  it("returns the retention days if set", async () => {
    const supabase = makeSupabase(90);
    const result = await getChatRetention(supabase, "user-1");
    expect(result).toBe(90);
  });
});

describe("setChatRetention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid values (less than min)", async () => {
    const supabase = makeSupabase();
    await expect(setChatRetention(supabase, "user-1", 5)).rejects.toThrow();
  });

  it("writes the value to the profile", async () => {
    const supabase = makeSupabase();
    const result = await setChatRetention(supabase, "user-1", 90);
    expect(result).toBe(90);
  });

  it("accepts null (keep forever)", async () => {
    const supabase = makeSupabase();
    const result = await setChatRetention(supabase, "user-1", null);
    expect(result).toBeNull();
  });
});

describe("enforceRetentionAfterWrite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is a no-op when retention is null (forever)", async () => {
    const supabase = makeSupabase(null);
    const result = await enforceRetentionAfterWrite(supabase, "user-1");
    expect(result).toBeNull();
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });

  it("calls purge_user_chats RPC with the retention days", async () => {
    const supabase = makeSupabase(90);
    mocks.adminRpc.mockResolvedValue({ data: 5, error: null });
    const result = await enforceRetentionAfterWrite(supabase, "user-1");
    expect(mocks.adminRpc).toHaveBeenCalledWith("purge_user_chats", {
      p_user_id: "user-1",
      p_retention_days: 90,
    });
    expect(result).toEqual({ deleted: 5 });
  });

  it("returns 0 when no rows were deleted", async () => {
    const supabase = makeSupabase(30);
    mocks.adminRpc.mockResolvedValue({ data: 0, error: null });
    const result = await enforceRetentionAfterWrite(supabase, "user-1");
    expect(result).toEqual({ deleted: 0 });
  });

  it("swallows RPC errors (best-effort — never break the chat send)", async () => {
    const supabase = makeSupabase(90);
    mocks.adminRpc.mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await enforceRetentionAfterWrite(supabase, "user-1");
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("swallows network errors (best-effort)", async () => {
    const supabase = makeSupabase(90);
    mocks.adminRpc.mockRejectedValue(new Error("network down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await enforceRetentionAfterWrite(supabase, "user-1");
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
