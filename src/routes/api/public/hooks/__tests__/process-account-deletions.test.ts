import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * AUDIT-020: tests for the /api/public/hooks/process-account-deletions
 * cron worker. Verifies the wiring between:
 *   - CRON_SECRET auth (delegated to requireCronSecret)
 *   - Supabase fetch of pending requests >24h old
 *   - Per-user SQL function call (process_account_deletion)
 *   - Response shape (processed / errors / counts)
 *
 * The SQL function itself is verified end-to-end via the Supabase
 * management API smoke test (see the migration commit message). The
 * test here focuses on the JS-side orchestration: that we call the
 * right function with the right args and aggregate results correctly.
 */

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/cronAuth.server", () => ({
  requireCronSecret: vi.fn(() => null), // always allow in tests
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mocks.from(...args),
    rpc: (...args: unknown[]) => mocks.rpc(...args),
  },
}));

// Import after mocks are wired.
import { Route } from "../process-account-deletions";

function getHandler() {
  return (
    Route as unknown as {
      options: {
        server: { handlers: { POST: (opts: { request: Request }) => Promise<Response> } };
      };
    }
  ).options.server.handlers.POST;
}

function makeRequest(): Request {
  return new Request("https://test.local/api/public/hooks/process-account-deletions", {
    method: "POST",
  });
}

/**
 * Build a `from(table)` mock that handles both the stuck-processing
 * reset call (update chain) and the pending-queue fetch (select
 * chain). Each test customises these via the returned builder.
 */
function makeFromBuilder(overrides?: {
  resetData?: { id: string }[] | null;
  resetError?: { message: string } | null;
  pendingData?: unknown[] | null;
  pendingError?: { message: string } | null;
}) {
  return (table: string) => {
    if (table !== "account_deletion_requests") return {};
    return {
      // stuck-processing reset chain: update().eq().lt().select()
      update: () => ({
        eq: () => ({
          lt: () => ({
            select: () =>
              Promise.resolve({
                data: overrides?.resetData ?? [],
                error: overrides?.resetError ?? null,
              }),
          }),
        }),
      }),
      // pending-queue fetch chain: select().eq().lt()
      select: () => ({
        eq: () => ({
          lt: () =>
            Promise.resolve({
              data: overrides?.pendingData ?? [],
              error: overrides?.pendingError ?? null,
            }),
        }),
      }),
    };
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no stuck processing, no pending requests.
  mocks.from.mockImplementation(makeFromBuilder());
  mocks.rpc.mockResolvedValue({ data: null, error: null });
});

describe("POST /api/public/hooks/process-account-deletions", () => {
  it("returns 401 when requireCronSecret rejects", async () => {
    // Override the cron auth mock for this one test.
    const { requireCronSecret } = await import("@/lib/cronAuth.server");
    (requireCronSecret as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    );
    const handler = getHandler();
    const res = await handler({ request: makeRequest() });
    expect(res.status).toBe(401);
  });

  it("returns ok with empty arrays when no pending requests exist", async () => {
    const handler = getHandler();
    const res = await handler({ request: makeRequest() });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      processed: unknown[];
      errors: unknown[];
      counts: { processed: number; errors: number; reset: number };
    };
    expect(body.ok).toBe(true);
    expect(body.processed).toEqual([]);
    expect(body.errors).toEqual([]);
    expect(body.counts).toEqual({ processed: 0, errors: 0, reset: 0 });
  });

  it("auto-recovers stuck 'processing' requests older than 60 minutes", async () => {
    const stuckRows = [{ id: "stuck-1" }, { id: "stuck-2" }];
    mocks.from.mockImplementation(makeFromBuilder({ resetData: stuckRows, pendingData: [] }));
    const handler = getHandler();
    const res = await handler({ request: makeRequest() });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      counts: { reset: number; processed: number };
    };
    // The reset count in the response is the source of truth — the
    // worker sets it from the number of rows the .update() returned.
    expect(body.counts.reset).toBe(2);
    expect(body.counts.processed).toBe(0);
    // The reset call must have targeted the right table.
    expect(mocks.from).toHaveBeenCalledWith("account_deletion_requests");
  });

  it("auto-recovery is a no-op when no rows are stuck", async () => {
    // Default mock returns empty arrays, which is the "nothing stuck" case.
    const handler = getHandler();
    const res = await handler({ request: makeRequest() });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      counts: { reset: number };
    };
    expect(body.counts.reset).toBe(0);
  });

  it("does not fail the cron when the stuck-processing reset errors (non-fatal)", async () => {
    mocks.from.mockImplementation(
      makeFromBuilder({ resetError: { message: "db connection lost" } }),
    );
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = getHandler();
    const res = await handler({ request: makeRequest() });
    consoleErrorSpy.mockRestore();
    // Cron should still 200 — reset failure is logged but non-fatal,
    // and there are no pending requests to process.
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      counts: { reset: number; processed: number };
    };
    expect(body.counts.reset).toBe(0);
    expect(body.counts.processed).toBe(0);
  });

  it("calls process_account_deletion RPC for each pending request", async () => {
    const pendingUsers = [
      { user_id: "u-1", requested_at: "2026-06-16T03:00:00Z", reason: null },
      { user_id: "u-2", requested_at: "2026-06-15T10:00:00Z", reason: "mau berhenti" },
    ];
    mocks.from.mockImplementation(makeFromBuilder({ pendingData: pendingUsers }));
    mocks.rpc.mockResolvedValue({
      data: { processed: true, user_id: "x", tables: { profiles: 1 } },
      error: null,
    });
    const handler = getHandler();
    const res = await handler({ request: makeRequest() });
    const body = (await res.json()) as {
      counts: { processed: number; errors: number };
    };
    expect(res.status).toBe(200);
    expect(body.counts.processed).toBe(2);
    expect(body.counts.errors).toBe(0);
    // Verify the RPC was called for each user.
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    expect(mocks.rpc).toHaveBeenNthCalledWith(1, "process_account_deletion", {
      p_user_id: "u-1",
    });
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "process_account_deletion", {
      p_user_id: "u-2",
    });
  });

  it("queries account_deletion_requests with status=pending AND requested_at < cutoff", async () => {
    // Build spies only for the PENDING-fetch chain (the second call
    // to from()). The first call (the stuck-processing reset) gets a
    // no-op chain — we just need it not to throw.
    const ltMock = vi.fn((_column: string, _cutoff: string) =>
      Promise.resolve({ data: [], error: null }),
    );
    const eqMock = vi.fn((_col: string, _val: string) => ({ lt: ltMock }));
    const selectMock = vi.fn((_cols: string) => ({ eq: eqMock }));
    mocks.from.mockImplementation((table: string) => {
      if (table !== "account_deletion_requests") return {};
      return {
        update: () => ({
          eq: () => ({ lt: () => ({ select: () => Promise.resolve({ data: [], error: null }) }) }),
        }),
        select: selectMock,
      };
    });
    const handler = getHandler();
    await handler({ request: makeRequest() });
    // The pending-fetch chain must target the right table and the right
    // status filter. lt() is also called by the reset branch, so we
    // check that the requested_at filter appeared SOMEWHERE in the calls.
    expect(selectMock).toHaveBeenCalledWith("user_id, requested_at, reason");
    const allEqCalls = eqMock.mock.calls as Array<[string, string]>;
    expect(allEqCalls.some(([col, val]) => col === "status" && val === "pending")).toBe(true);
    const allLtCalls = ltMock.mock.calls as Array<[string, string]>;
    const requestedAtCalls = allLtCalls.filter(([col]) => col === "requested_at");
    expect(requestedAtCalls.length).toBeGreaterThanOrEqual(1);
    const cutoffMs = new Date(requestedAtCalls[0][1]).getTime();
    const expected = Date.now() - 24 * 60 * 60 * 1000;
    expect(Math.abs(cutoffMs - expected)).toBeLessThan(5_000);
  });

  it("continues processing after a per-user failure (does not abort the queue)", async () => {
    mocks.from.mockImplementation(
      makeFromBuilder({
        pendingData: [
          { user_id: "u-ok", requested_at: "2026-06-16T03:00:00Z", reason: null },
          { user_id: "u-bad", requested_at: "2026-06-16T03:00:00Z", reason: null },
          { user_id: "u-also-ok", requested_at: "2026-06-16T03:00:00Z", reason: null },
        ],
      }),
    );
    // 1st call: ok. 2nd: throws. 3rd: ok.
    mocks.rpc
      .mockResolvedValueOnce({ data: { processed: true }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "rls violation" } })
      .mockResolvedValueOnce({ data: { processed: true }, error: null });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = getHandler();
    const res = await handler({ request: makeRequest() });
    consoleErrorSpy.mockRestore();
    const body = (await res.json()) as {
      processed: Array<{ user_id: string }>;
      errors: Array<{ user_id: string; message: string }>;
      counts: { processed: number; errors: number };
    };
    expect(res.status).toBe(200);
    expect(body.counts.processed).toBe(2);
    expect(body.counts.errors).toBe(1);
    expect(body.errors[0].user_id).toBe("u-bad");
    expect(body.errors[0].message).toBe("rls violation");
    expect(mocks.rpc).toHaveBeenCalledTimes(3);
  });

  it("returns 500 if the initial pending-request fetch fails", async () => {
    mocks.from.mockImplementation(
      makeFromBuilder({ pendingError: { message: "table not found" } }),
    );
    const handler = getHandler();
    const res = await handler({ request: makeRequest() });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toBe("table not found");
  });
});
