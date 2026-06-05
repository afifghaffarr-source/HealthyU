import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { parseInput } from "@/lib/validation";
import { USER_DATA_TABLES } from "@/lib/userDataTables";

/**
 * UU PDP (Pelindungan Data Pribadi) — user rights.
 * - exportMyData: returns JSON of all rows belonging to the user (Right to Portability).
 * - requestAccountDeletion: queues an account-deletion request (Right to Erasure).
 */

export const exportMyData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    type JsonValue =
      | string
      | number
      | boolean
      | null
      | JsonValue[]
      | { [key: string]: JsonValue };
    const dump: Record<string, JsonValue> = {
      exported_at: new Date().toISOString(),
      user_id: userId,
    };
    for (const { table, ownerColumn, optional } of USER_DATA_TABLES) {
      // Dynamic table name — Supabase's `.from()` is typed against the union
      // of literal table names, which can't be satisfied at runtime here.
      const { data, error } = await supabase
        .from(table as never)
        .select("*")
        .eq(ownerColumn, userId);
      if (!error) {
        dump[table] = (data ?? []) as JsonValue;
      } else if (optional) {
        dump[table] = [];
      } else {
        // Never leak raw DB errors to the user. Log full error server-side
        // (Supabase logs already capture it) and surface a generic marker.
        console.error(`[pdp.export] ${table}:`, error);
        dump[table] = { error: "unavailable" };
      }
    }
    await supabase.rpc("log_audit_event", {
      _action: "pdp.export",
      _entity: "user",
      _entity_id: userId,
    });
    return dump;
  });

export const requestAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    parseInput(z.object({ reason: z.string().max(500).optional() }), i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: id, error } = await supabase.rpc("request_account_deletion", {
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const cancelAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("account_deletion_requests")
      .delete()
      .eq("user_id", userId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    await supabase.rpc("log_audit_event", {
      _action: "account.deletion_cancelled",
      _entity: "account_deletion_requests",
    });
    return { ok: true };
  });

export const getDeletionRequest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("account_deletion_requests")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { request: data };
  });
