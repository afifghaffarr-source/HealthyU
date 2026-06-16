import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

/**
 * AUDIT-017 Phase 2E: tests for the PII audit log helpers.
 *
 * The hard rule these tests enforce: **never log the actual PII
 * value**. Only the kinds list + count. The mock assertions
 * double-check that no `value` field sneaks into the payload.
 */

const mocks = vi.hoisted(() => ({
  reportError: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/errorReporting", () => ({
  reportError: mocks.reportError,
}));

import { auditPiiOnClient, auditPiiOnServer } from "../piiAudit";

describe("auditPiiOnClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("no-ops on empty text", () => {
    auditPiiOnClient("");
    expect(mocks.reportError).not.toHaveBeenCalled();
  });

  it("no-ops on clean text (no PII detected)", () => {
    auditPiiOnClient("Berapa kalori dalam nasi goreng?");
    expect(mocks.reportError).not.toHaveBeenCalled();
  });

  it("calls reportError with kind list when PII detected", () => {
    auditPiiOnClient("Hubungi 081234567890 atau a@b.com");
    expect(mocks.reportError).toHaveBeenCalledTimes(1);
    const [_err, context, options] = mocks.reportError.mock.calls[0];
    expect(context.kinds).toEqual(["phone", "email"]);
    expect(context.count).toBe(2);
    expect(context.source).toBe("chat.pii.detected.client");
    expect(options.severity).toBe("warning");
    expect(options.handled).toBe(true);
  });

  it("never includes the actual PII value in the payload", () => {
    const secret = "081234567890";
    auditPiiOnClient(`Hubungi ${secret} segera`);
    const allCalls = mocks.reportError.mock.calls.map((c) => JSON.stringify(c));
    for (const serialized of allCalls) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("does not throw even if reportError throws", () => {
    // reportError is documented as never-throws, but defensively
    // we want our caller to not crash if that contract breaks.
    mocks.reportError.mockImplementation(() => {
      throw new Error("reporting backend down");
    });
    expect(() => auditPiiOnClient("081234567890")).not.toThrow();
  });
});

describe("auditPiiOnServer", () => {
  let supabase: { rpc: typeof mocks.rpc };

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = { rpc: mocks.rpc };
    mocks.rpc.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("no-ops on empty text", async () => {
    await auditPiiOnServer(supabase, "user-1", "");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("no-ops on clean text", async () => {
    await auditPiiOnServer(supabase, "user-1", "Halo!");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("writes to audit_log with kinds only, never the PII value", async () => {
    // 16 digits matches BOTH ktp and credit_card regex — that's
    // a known overlap. The audit should report both kinds.
    const secret = "3201234567890001"; // fake NIK
    await auditPiiOnServer(supabase, "user-1", `KTP saya ${secret}`);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    const [fnName, args] = mocks.rpc.mock.calls[0];
    expect(fnName).toBe("log_audit_event");
    expect(args._action).toBe("chat.pii.detected");
    expect(args._entity).toBe("chat");
    expect(args._meta.kinds).toContain("ktp");
    expect(args._meta.kinds).toContain("credit_card");
    // Count is number of findings, not kinds — a 16-digit string
    // yields 2 findings (one per regex match).
    expect(args._meta.count).toBe(2);
    // PII value must NEVER appear in the audit log
    expect(JSON.stringify(args)).not.toContain(secret);
  });

  it("count is the number of findings, not the number of kinds", async () => {
    // Two phone numbers in one message = 2 findings, 1 kind
    await auditPiiOnServer(supabase, "user-1", "Telp 081234567890 atau 081234567891");
    const args = mocks.rpc.mock.calls[0][1];
    expect(args._meta.kinds).toEqual(["phone"]);
    expect(args._meta.count).toBe(2);
  });

  it("does not throw when RPC rejects", async () => {
    mocks.rpc.mockRejectedValue(new Error("supabase down"));
    await expect(auditPiiOnServer(supabase, "user-1", "081234567890")).resolves.toBeUndefined();
  });
});
