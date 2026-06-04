import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { parseInput } from "@/lib/validation";

/**
 * UU PDP (Pelindungan Data Pribadi) — user rights.
 * - exportMyData: returns JSON of all rows belonging to the user (Right to Portability).
 * - requestAccountDeletion: queues an account-deletion request (Right to Erasure).
 */

const USER_TABLES = [
  "profiles",
  "meals",
  "water_intake",
  "workouts",
  "weight_logs",
  "mood_logs",
  "sleep_logs",
  "vitals",
  "medications",
  "chat_messages",
  "sensitive_health_notes",
  "scan_history",
  "fasting_logs",
  "challenge_participants",
  "audit_log",
] as const;

export const exportMyData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const dump: Record<string, any> = {
      exported_at: new Date().toISOString(),
      user_id: userId,
    };
    for (const table of USER_TABLES) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).from(table).select("*").eq("user_id", userId);
      if (!error) dump[table] = data ?? [];
      else dump[table] = { error: error.message };
    }
    await supabase.rpc("log_audit_event", {
      _action: "pdp.export",
      _entity: "user",
      _entity_id: userId,
    });
    return dump as Record<string, any>;
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
