/**
 * Admin Config — server fns for /admin/config.
 *
 * public.app_config — key/value runtime config (admin-editable).
 * Every write appends an audit_log row.
 *
 * Pattern: POST + parseInput + ensureAdmin, mirrors adminUsers.functions.ts.
 *
 * NOTE: app_config + i18n_overrides tables are NOT in the generated
 * Supabase types (we added them via raw SQL). We cast `supabaseAdmin` to
 * `any` for the queries on these tables. Safe because these fns are
 * server-only and the keys are typed by our own zod schemas.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { parseInput } from "@/lib/validation";

const ADMIN_GUARD = requireSupabaseAuth;
// Cast needed because `app_config` and `i18n_overrides` tables are not yet
// in the generated Supabase types (added in Sprint 57 migration). Re-generate
// types via `bunx supabase gen types typescript` and remove this cast.
const db = supabaseAdmin as any; // eslint-disable-line no-restricted-syntax, @typescript-eslint/no-explicit-any

const KeySchema = z.string().min(1).max(120);
const CategorySchema = z.enum([
  "feature",
  "defaults",
  "gamification",
  "ui",
  "rate_limit",
  "general",
]);
const DataTypeSchema = z.enum(["string", "number", "boolean", "json"]);

async function ensureAdmin(userId: string) {
  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  } as never);
  if (!isAdmin) throw new Error("Forbidden: admin role required");
}

// ── Types ───────────────────────────────────────────────────────────

export type ConfigRow = {
  key: string;
  value: string | number | boolean | null;
  category: string;
  label: string;
  description: string | null;
  data_type: "string" | "number" | "boolean" | "json";
  options: Array<string | number> | null;
  is_secret: boolean;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
};

export type ConfigCategory = z.infer<typeof CategorySchema>;
export type ConfigDataType = z.infer<typeof DataTypeSchema>;

// ── Schemas ─────────────────────────────────────────────────────────

const ListInput = z.object({ category: CategorySchema.optional() }).optional().default({});
const GetInput = z.object({ key: KeySchema });
const SetInput = z.object({
  key: KeySchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  category: CategorySchema.optional(),
  label: z.string().min(1).optional(),
  description: z.string().optional(),
  data_type: DataTypeSchema.optional(),
  options: z.array(z.union([z.string(), z.number()])).optional(),
  is_secret: z.boolean().optional(),
});
const DeleteInput = z.object({ key: KeySchema });
const PublicReadInput = z.object({
  key: KeySchema,
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
});

// ── List (admin) ────────────────────────────────────────────────────

export const listAppConfig = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .inputValidator((i: unknown) => parseInput(ListInput, i))
  .handler(async ({ data, context }): Promise<ConfigRow[]> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);

    let q = db
      .from("app_config")
      .select(
        "key, value, category, label, description, data_type, options, is_secret, updated_by, updated_at, created_at",
      )
      .order("category", { ascending: true })
      .order("label", { ascending: true });
    if (data.category) q = q.eq("category", data.category);
    const { data: rows, error } = await q;
    if (error) throw new Error(`listAppConfig: ${error.message}`);
    return (rows ?? []) as ConfigRow[];
  });

// ── Set (admin) ─────────────────────────────────────────────────────

export const setAppConfig = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .inputValidator((i: unknown) => parseInput(SetInput, i))
  .handler(async ({ data, context }): Promise<ConfigRow> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);

    const payload: Record<string, unknown> = {
      key: data.key,
      value: data.value,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };
    if (data.category) payload.category = data.category;
    if (data.label) payload.label = data.label;
    if (data.description !== undefined) payload.description = data.description;
    if (data.data_type) payload.data_type = data.data_type;
    if (data.options) payload.options = data.options;
    if (data.is_secret !== undefined) payload.is_secret = data.is_secret;

    const { data: row, error } = await db
      .from("app_config")
      .upsert(payload, { onConflict: "key" })
      .select(
        "key, value, category, label, description, data_type, options, is_secret, updated_by, updated_at, created_at",
      )
      .single();
    if (error) throw new Error(`setAppConfig: ${error.message}`);

    await db.from("audit_log").insert({
      user_id: userId,
      action: "config.set",
      meta: { key: data.key, value: data.value },
    });

    return row as ConfigRow;
  });

// ── Delete (admin) ──────────────────────────────────────────────────

export const deleteAppConfig = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .inputValidator((i: unknown) => parseInput(DeleteInput, i))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);
    const { error } = await db.from("app_config").delete().eq("key", data.key);
    if (error) throw new Error(`deleteAppConfig: ${error.message}`);

    await db.from("audit_log").insert({
      user_id: userId,
      action: "config.delete",
      meta: { key: data.key },
    });
    return { deleted: true } as const;
  });

// ── Public read (no admin required) — used by app-wide feature hooks ─

export const readPublicConfig = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => parseInput(PublicReadInput, i))
  .handler(async ({ data }): Promise<string | number | boolean | null | undefined> => {
    const { data: row, error } = await db
      .from("app_config")
      .select("value, data_type")
      .eq("key", data.key)
      .maybeSingle();
    if (error || !row) return data.defaultValue ?? null;
    const v = (row as { value: string | number | boolean | null }).value;
    return v;
  });
