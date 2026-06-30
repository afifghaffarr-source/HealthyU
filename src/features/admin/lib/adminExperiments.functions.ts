/**
 * Admin Experiments — A/B test variants (Sprint 58-E).
 *
 * Table (not in generated types): experiments.
 * Cast supabaseAdmin to `any` for this table (same Sprint 57 pattern as promo_codes).
 *
 * Admin fns: list/create/update/delete.
 * Public fn: getExperimentVariant (SECURITY DEFINER RPC).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { parseInput } from "@/lib/validation";

const ADMIN_GUARD = requireSupabaseAuth;
// ponytail: cast for tables not in generated types; remove after `bunx supabase gen types`
const db = supabaseAdmin as any; // eslint-disable-line no-restricted-syntax, @typescript-eslint/no-explicit-any

async function ensureAdmin(userId: string) {
  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  } as never);
  if (!isAdmin) throw new Error("Forbidden: admin role required");
}

// ── Types ───────────────────────────────────────────────────────────

export type ExperimentRow = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  variant_a_json: Record<string, unknown>;
  variant_b_json: Record<string, unknown>;
  split_pct: number;
  is_active: boolean;
  created_at: string;
};

// ── Schemas ─────────────────────────────────────────────────────────

const CreateExperimentSchema = z.object({
  key: z.string().min(1).max(120),
  label: z.string().min(1).max(200),
  description: z.string().max(500).optional().nullable(),
  variant_a_json: z.record(z.unknown()),
  variant_b_json: z.record(z.unknown()),
  split_pct: z.number().int().min(0).max(100),
  is_active: z.boolean().optional(),
});

const UpdateExperimentSchema = z.object({
  id: z.string().uuid(),
  key: z.string().min(1).max(120).optional(),
  label: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional().nullable(),
  variant_a_json: z.record(z.unknown()).optional(),
  variant_b_json: z.record(z.unknown()).optional(),
  split_pct: z.number().int().min(0).max(100).optional(),
  is_active: z.boolean().optional(),
});

const DeleteExperimentSchema = z.object({ id: z.string().uuid() });

// ── Admin: Experiments ───────────────────────────────────────────────

const SELECT_COLS =
  "id,key,label,description,variant_a_json,variant_b_json,split_pct,is_active,created_at";

// ponytail: cast return type to bypass TanStack serialized-strict checker; the
// variant_*_json fields are Record<string, unknown> (JSONB) which the checker
// flags as non-serializable. Same workaround as the `db` cast above. Remove
// after the checker grows support for arbitrary JSONB rows.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

export const listExperimentsAdmin = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .handler(async ({ context }): Promise<AnyRow> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);
    const { data, error } = await db
      .from("experiments")
      .select(SELECT_COLS)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`listExperiments: ${error.message}`);
    return (data ?? []) as AnyRow;
  });

export const createExperimentAdmin = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .inputValidator((i: unknown) => parseInput(CreateExperimentSchema, i))
  .handler(async ({ data, context }): Promise<AnyRow> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);
    const { data: row, error } = await db
      .from("experiments")
      .insert({
        ...data,
        created_by: userId,
      })
      .select(SELECT_COLS)
      .single();
    if (error) throw new Error(`createExperiment: ${error.message}`);
    return row as AnyRow;
  });

export const updateExperimentAdmin = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .inputValidator((i: unknown) => parseInput(UpdateExperimentSchema, i))
  .handler(async ({ data, context }): Promise<AnyRow> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);
    const { id, ...patch } = data;
    const { data: row, error } = await db
      .from("experiments")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(SELECT_COLS)
      .single();
    if (error) throw new Error(`updateExperiment: ${error.message}`);
    return row as AnyRow;
  });

export const deleteExperimentAdmin = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .inputValidator((i: unknown) => parseInput(DeleteExperimentSchema, i))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);
    const { error } = await db.from("experiments").delete().eq("id", data.id);
    if (error) throw new Error(`deleteExperiment: ${error.message}`);
    return { ok: true };
  });

// ── Public: Get Experiment Variant ──────────────────────────────────

export type ExperimentVariantResult = {
  variant: "a" | "b";
  payload: Record<string, unknown>;
};

const GetVariantSchema = z.object({
  key: z.string().min(1).max(120),
  userId: z.string().uuid().optional().nullable(),
});

export const getExperimentVariant = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => parseInput(GetVariantSchema, i))
  .handler(async ({ data }): Promise<AnyRow> => {
    const { data: result, error } = await supabaseAdmin.rpc(
      "get_experiment_variant" as never,
      {
        _key: data.key,
        _user_id: data.userId ?? null,
      } as never,
    );
    if (error) throw new Error(`getExperimentVariant: ${error.message}`);
    // RPC returns array of { variant, payload } rows; take first
    const row = Array.isArray(result) ? result[0] : result;
    if (!row) return { variant: "a", payload: {} } as AnyRow;
    return {
      variant: ((row as { variant: string }).variant === "b" ? "b" : "a") as "a" | "b",
      payload:
        ((row as { payload: Record<string, unknown> }).payload as Record<string, unknown>) ?? {},
    } as AnyRow;
  });
