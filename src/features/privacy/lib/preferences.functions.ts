import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any; // new columns/tables not yet in generated types

const PreferencesSchema = z.object({
  preferred_unit: z.enum(["metric", "imperial"]).optional(),
  preferred_language: z.enum(["id", "en"]).optional(),
  preferred_theme: z.enum(["light", "dark", "system"]).optional(),
  timezone: z.string().max(50).optional(),
});

export type UserPreferences = {
  preferred_unit: "metric" | "imperial";
  preferred_language: "id" | "en";
  preferred_theme: "light" | "dark" | "system";
  timezone: string;
};

const DEFAULTS: UserPreferences = {
  preferred_unit: "metric",
  preferred_language: "id",
  preferred_theme: "system",
  timezone: "Asia/Jakarta",
};

export const getPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await (supabase as AnyClient)
      .from("profiles")
      .select("preferred_unit, preferred_language, preferred_theme, timezone")
      .eq("id", userId)
      .maybeSingle();

    return {
      ...DEFAULTS,
      ...(data ?? {}),
    } as UserPreferences;
  });

export const updatePreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => PreferencesSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Partial<UserPreferences> = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as Partial<UserPreferences>;
    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await (supabase as AnyClient)
      .from("profiles")
      .update(patch as never)
      .eq("id", userId);

    if (error) throw new Error(error.message);

    await (supabase as AnyClient).rpc("log_audit_event", {
      _action: "preferences.updated",
      _entity: "profile",
      _meta: patch as never,
    });

    return { ok: true };
  });

// ─── Export history ──────────────────────────────────────────────────────────

export const recordExportStart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ format: z.enum(["json", "csv"]) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await (supabase as AnyClient)
      .from("data_export_history")
      .insert({
        user_id: userId,
        format: data.format,
        status: "started",
        started_at: new Date().toISOString(),
      } as never)
      .select("id")
      .maybeSingle();
    return { export_id: row?.id ?? null };
  });

export const recordExportComplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        export_id: z.string().uuid(),
        status: z.enum(["completed", "failed"]),
        size_bytes: z.number().int().nonnegative().optional(),
        table_count: z.number().int().nonnegative().optional(),
        row_count: z.number().int().nonnegative().optional(),
        error_message: z.string().max(500).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await (supabase as AnyClient)
      .from("data_export_history")
      .update({
        status: data.status,
        size_bytes: data.size_bytes ?? null,
        table_count: data.table_count ?? null,
        row_count: data.row_count ?? null,
        error_message: data.error_message ?? null,
        completed_at: new Date().toISOString(),
      } as never)
      .eq("id", data.export_id)
      .eq("user_id", userId);
    return { ok: true };
  });

export const getExportHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await (supabase as AnyClient)
      .from("data_export_history")
      .select("id, format, status, size_bytes, table_count, row_count, started_at, completed_at")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);
    return data ?? [];
  });
