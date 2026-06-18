import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for the pii_redact_enabled toggle helpers.
 *
 * These helpers take a supabase client as their first arg (no module-level
 * import), so the tests can pass a fresh mock supabase per scenario.
 * The server-fn wrappers (`getPiiRedactEnabledFn`, `setPiiRedactEnabledFn`)
 * are wired in `profile.privacy.tsx` via `useServerFn` and are exercised
 * in the route's tests, not here.
 */
import {
  getPiiRedactEnabled,
  setPiiRedactEnabled,
} from "@/features/privacy/lib/piiRedactToggle.functions";

type ChainResult = { data: unknown; error: unknown };

function mockSupabaseRead(result: ChainResult) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve(result),
        }),
      }),
    }),
  };
}

function mockSupabaseUpdate(result: { error: unknown }) {
  return {
    from: () => ({
      update: () => ({
        eq: () => Promise.resolve(result),
      }),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPiiRedactEnabled", () => {
  it("returns true when the profile has pii_redact_enabled=true", async () => {
    const sb = mockSupabaseRead({ data: { pii_redact_enabled: true }, error: null }) as never;
    expect(await getPiiRedactEnabled(sb, "user-1")).toBe(true);
  });

  it("returns false when the profile has pii_redact_enabled=false", async () => {
    const sb = mockSupabaseRead({ data: { pii_redact_enabled: false }, error: null }) as never;
    expect(await getPiiRedactEnabled(sb, "user-1")).toBe(false);
  });

  it("returns false (default) when the profile row is missing", async () => {
    const sb = mockSupabaseRead({ data: null, error: null }) as never;
    // Missing profile must NOT default to true — that would surprise the
    // user by turning on redaction they never asked for.
    expect(await getPiiRedactEnabled(sb, "user-1")).toBe(false);
  });

  it("returns false when the query errors (fail-safe default)", async () => {
    const sb = mockSupabaseRead({
      data: null,
      error: { message: "permission denied" },
    }) as never;
    // Fail-safe: if we can't read the setting, leave redaction OFF rather
    // than silently turning it on or throwing into the chat stream.
    expect(await getPiiRedactEnabled(sb, "user-1")).toBe(false);
  });

  it("queries the profiles table with eq('id', userId)", async () => {
    const fromMock = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { pii_redact_enabled: false },
            error: null,
          }),
        })),
      })),
    }));
    const sb = { from: fromMock } as never;
    await getPiiRedactEnabled(sb, "user-42");
    expect(fromMock).toHaveBeenCalledWith("profiles");
  });
});

describe("setPiiRedactEnabled", () => {
  it("updates the profile and returns { ok: true } on success", async () => {
    const updateMock = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
    const sb = { from: () => ({ update: updateMock }) } as never;
    const result = await setPiiRedactEnabled(sb, "user-1", true);
    expect(result).toEqual({ ok: true });
    expect(updateMock).toHaveBeenCalledWith({ pii_redact_enabled: true });
  });

  it("propagates the error message when the update fails", async () => {
    const sb = mockSupabaseUpdate({ error: { message: "rls violation" } }) as never;
    await expect(setPiiRedactEnabled(sb, "user-1", true)).rejects.toThrow("rls violation");
  });

  it("can set the value back to false (round-trip off → on → off)", async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn(() => ({ eq: eqMock }));
    const sb = { from: () => ({ update: updateMock }) } as never;
    await setPiiRedactEnabled(sb, "user-1", true);
    await setPiiRedactEnabled(sb, "user-1", false);
    expect(updateMock).toHaveBeenNthCalledWith(1, { pii_redact_enabled: true });
    expect(updateMock).toHaveBeenNthCalledWith(2, { pii_redact_enabled: false });
  });
});
