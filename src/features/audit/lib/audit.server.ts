import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { logServerError } from "@/lib/logger.server";

/**
 * Write an audit-log entry for the currently authenticated user.
 * Call from within server functions (after requireSupabaseAuth) using the
 * user-scoped Supabase client so auth.uid() resolves correctly.
 *
 * Fail-silent: audit logging must never break user flows.
 */
export async function logAudit(
  supabase: SupabaseClient<Database>,
  action: string,
  options?: {
    entity?: string;
    entityId?: string;
    meta?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.rpc("log_audit_event", {
    _action: action,
    _entity: options?.entity ?? undefined,
    _entity_id: options?.entityId ?? undefined,
    _meta: (options?.meta ?? {}) as never,
  });
  if (error) {
    logServerError("audit.logFailed", error, { action });
  }
}
