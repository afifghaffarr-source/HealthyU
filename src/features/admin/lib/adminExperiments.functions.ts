/**
 * Admin Experiments — A/B test variants (Sprint 58-E).
 *
 * Table (not in generated types): experiments.
 * Cast supabaseAdmin to `any` for this table (same Sprint 57 pattern as promo_codes).
 *
 * Admin fns: list/create/update/delete.
 * Public fn: getExperimentVariant (SECURITY DEFINER RPC).
 * Sprint 58-I adds real tracking: trackExperimentEvent (public, fire-and-forget)
 * + getExperimentStatsAdmin (admin, aggregated from error_reports).
 *
 * ponytail scoreboard (Sprint 58-I):
 *   - 0 new tables, 0 new cron, 0 new KV, 0 new deps, 0 new endpoints
 *   - reuses error_reports (Sprint 19 telemetry pattern): source LIKE
 *     'telemetry:experiment.%' → impressions/conversions/CTR per variant
 *   - bounded volume: <100 events/day/user expected; if it grows, swap to
 *     a dedicated telemetry_events table (deferred).
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

// ── Public: Track Experiment Event (impression / conversion) ────────
// Sprint 58-I — real A/B tracking via error_reports reuse (Ponytail).

const TrackEventSchema = z.object({
  event: z.enum(["impression", "conversion"]),
  key: z.string().min(1).max(120),
  variant: z.enum(["a", "b"]),
  sessionId: z.string().min(1).max(100),
  conversionType: z.string().max(50).optional(),
  userId: z.string().uuid().optional().nullable(),
});

export const trackExperimentEvent = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => parseInput(TrackEventSchema, i))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    // Mirror track() payload shape: source='telemetry:experiment.${event}',
    // context carries the props. Severity=info, mechanism=telemetry.
    const source = `telemetry:experiment.${data.event}`;
    const ctx: Record<string, unknown> = {
      key: data.key,
      variant: data.variant,
      sessionId: data.sessionId,
      is_telemetry: true,
    };
    if (data.conversionType) ctx.conversionType = data.conversionType;

    const { error } = await supabaseAdmin.from("error_reports").insert({
      user_id: data.userId ?? null,
      source,
      boundary: "global",
      message: `event:experiment.${data.event}`,
      context: ctx as never,
      route: null,
      handled: true,
      severity: "info",
    });

    if (error) {
      // Never throw — telemetry must not crash the app.

      console.warn("[trackExperimentEvent] insert failed:", error.message);
      return { ok: false };
    }
    return { ok: true };
  });

// ── Admin: Get Experiment Stats (impressions / conversions / CTR) ────

const GetStatsSchema = z.object({
  key: z.string().min(1).max(120),
  windowDays: z.number().int().min(1).max(90).optional(),
});

export type VariantStats = {
  impressions: number;
  conversions: number;
  ctr: number; // percentage 0.0–100.0, 1 decimal
};

export type ExperimentStats = {
  variant_a: VariantStats;
  variant_b: VariantStats;
  total: VariantStats;
  window_days: number;
};

const EMPTY_STATS: VariantStats = { impressions: 0, conversions: 0, ctr: 0 };

function makeStats(imp: number, conv: number): VariantStats {
  return {
    impressions: imp,
    conversions: conv,
    ctr: imp > 0 ? Math.round((conv / imp) * 1000) / 10 : 0,
  };
}

export const getExperimentStatsAdmin = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .inputValidator((i: unknown) => parseInput(GetStatsSchema, i))
  .handler(async ({ data, context }): Promise<ExperimentStats> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);
    const days = data.windowDays ?? 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Fetch from error_reports. Bounded volume (<100/day/user) — no RPC needed.
    // ponytail: if volume grows, swap to a dedicated RPC with FILTER (WHERE).
    const { data: rows, error } = await db
      .from("error_reports")
      .select("source, context")
      .like("source", "telemetry:experiment.%")
      .eq("context->>key", data.key)
      .gte("created_at", since);

    if (error) throw new Error(`getExperimentStats: ${error.message}`);

    const a = { imp: 0, conv: 0 };
    const b = { imp: 0, conv: 0 };
    for (const r of (rows ?? []) as Array<{
      source: string;
      context: { variant?: string } | null;
    }>) {
      const v = r.context?.variant === "b" ? "b" : "a";
      if (r.source === "telemetry:experiment.impression") {
        if (v === "b") b.imp++;
        else a.imp++;
      } else if (r.source === "telemetry:experiment.conversion") {
        if (v === "b") b.conv++;
        else a.conv++;
      }
    }

    return {
      variant_a: makeStats(a.imp, a.conv),
      variant_b: makeStats(b.imp, b.conv),
      total: makeStats(a.imp + b.imp, a.conv + b.conv),
      window_days: days,
    };
  });

// Re-export EMPTY_STATS for the UI when the query has no data yet.
export { EMPTY_STATS };
