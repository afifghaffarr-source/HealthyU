import { describe, it, expect, vi } from "vitest";
import { logAudit } from "@/features/audit/lib/audit.server";

function mkClient(rpcImpl: (...a: unknown[]) => Promise<{ error: unknown }>) {
  return { rpc: vi.fn(rpcImpl) } as unknown as Parameters<typeof logAudit>[0] & {
    rpc: ReturnType<typeof vi.fn>;
  };
}

describe("logAudit", () => {
  it("calls log_audit_event RPC with action + defaults", async () => {
    const client = mkClient(async () => ({ error: null }));
    await logAudit(client, "test.action");
    expect(client.rpc).toHaveBeenCalledWith("log_audit_event", {
      _action: "test.action",
      _entity: undefined,
      _entity_id: undefined,
      _meta: {},
    });
  });

  it("passes entity, entityId, meta", async () => {
    const client = mkClient(async () => ({ error: null }));
    await logAudit(client, "x", { entity: "post", entityId: "1", meta: { k: 1 } });
    expect(client.rpc).toHaveBeenCalledWith("log_audit_event", {
      _action: "x",
      _entity: "post",
      _entity_id: "1",
      _meta: { k: 1 },
    });
  });

  it("swallows errors (fail-silent)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = mkClient(async () => ({ error: { message: "boom" } }));
    await expect(logAudit(client, "x")).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
