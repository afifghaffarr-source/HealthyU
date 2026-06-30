/**
 * Admin i18n overrides — server fns for /admin/i18n.
 *
 * DB override > bundled i18n.tsx.
 *
 * Casts supabaseAdmin to any for i18n_overrides table access (not in
 * generated types since added via raw SQL).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { bundles } from "@/lib/i18n";
import { parseInput } from "@/lib/validation";

const ADMIN_GUARD = requireSupabaseAuth;
// Cast needed because `i18n_overrides` table is not yet in generated Supabase
// types (added in Sprint 57 migration). Re-generate types via
// `bunx supabase gen types typescript` and remove this cast.
const db = supabaseAdmin as any; // eslint-disable-line no-restricted-syntax, @typescript-eslint/no-explicit-any

const LocaleSchema = z.enum(["id", "en"]);
const KeySchema = z.string().min(1).max(200);

async function ensureAdmin(userId: string) {
  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  } as never);
  if (!isAdmin) throw new Error("Forbidden: admin role required");
}

// ── Types ───────────────────────────────────────────────────────────

export type OverrideRow = {
  key: string;
  locale: "id" | "en";
  value: string;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
};

export type TranslationRow = {
  key: string;
  id_value: string;
  en_value: string;
  id_override: string | null;
  en_override: string | null;
  overridden: boolean;
};

// ── Schemas ─────────────────────────────────────────────────────────

const ListInput = z
  .object({
    locale: LocaleSchema.optional(),
    search: z.string().optional(),
    limit: z.number().int().min(1).max(500).optional(),
  })
  .optional()
  .default({});
const SetInput = z.object({
  key: KeySchema,
  locale: LocaleSchema,
  value: z.string().min(1).max(2000),
});
const DeleteInput = z.object({ key: KeySchema, locale: LocaleSchema });
const ListAllKeysInput = z
  .object({
    search: z.string().optional(),
    overrideFilter: z.enum(["all", "overridden", "default"]).optional(),
    limit: z.number().int().min(1).max(2000).optional(),
  })
  .optional()
  .default({});
const PublicReadInput = z.object({ locale: LocaleSchema });

// ── List overrides ─────────────────────────────────────────────────

export const listI18nOverrides = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .inputValidator((i: unknown) => parseInput(ListInput, i))
  .handler(async ({ data, context }): Promise<OverrideRow[]> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);

    let q = db
      .from("i18n_overrides")
      .select("key, locale, value, updated_by, updated_at, created_at")
      .order("key", { ascending: true });
    if (data.locale) q = q.eq("locale", data.locale);
    if (data.search) q = q.ilike("key", `%${data.search}%`);
    if (data.limit) q = q.limit(data.limit);
    const { data: rows, error } = await q;
    if (error) throw new Error(`listI18nOverrides: ${error.message}`);
    return (rows ?? []) as OverrideRow[];
  });

// ── Upsert override ────────────────────────────────────────────────

export const setI18nOverride = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .inputValidator((i: unknown) => parseInput(SetInput, i))
  .handler(async ({ data, context }): Promise<OverrideRow> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);

    const { data: row, error } = await db
      .from("i18n_overrides")
      .upsert(
        {
          key: data.key,
          locale: data.locale,
          value: data.value,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        },
        { onConflict: "key,locale" },
      )
      .select("key, locale, value, updated_by, updated_at, created_at")
      .single();
    if (error) throw new Error(`setI18nOverride: ${error.message}`);

    await db.from("audit_log").insert({
      user_id: userId,
      action: "i18n.set",
      meta: { key: data.key, locale: data.locale, value: data.value },
    });
    return row as OverrideRow;
  });

// ── Delete override (fallback to bundle) ───────────────────────────

export const deleteI18nOverride = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .inputValidator((i: unknown) => parseInput(DeleteInput, i))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);
    const { error } = await db
      .from("i18n_overrides")
      .delete()
      .eq("key", data.key)
      .eq("locale", data.locale);
    if (error) throw new Error(`deleteI18nOverride: ${error.message}`);
    await db.from("audit_log").insert({
      user_id: userId,
      action: "i18n.delete",
      meta: { key: data.key, locale: data.locale },
    });
    return { deleted: true } as const;
  });

// ── List every TranslationKey + its override status (for editor) ───

export const listAllTranslationKeys = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .inputValidator((i: unknown) => parseInput(ListAllKeysInput, i))
  .handler(async ({ data, context }): Promise<TranslationRow[]> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);

    const { data: overrides } = await db.from("i18n_overrides").select("key, locale, value");
    const overrideMap = new Map<string, { id?: string; en?: string }>();
    for (const o of (overrides ?? []) as Array<{
      key: string;
      locale: "id" | "en";
      value: string;
    }>) {
      const entry = overrideMap.get(o.key) ?? {};
      if (o.locale === "id") entry.id = o.value;
      else entry.en = o.value;
      overrideMap.set(o.key, entry);
    }

    const idBundle = bundles.id as Record<string, string>;
    const enBundle = bundles.en as Record<string, string>;
    const allKeys = Object.keys(idBundle).sort();

    let rows: TranslationRow[] = allKeys.map((key) => {
      const ov = overrideMap.get(key);
      return {
        key,
        id_value: idBundle[key],
        en_value: enBundle[key],
        id_override: ov?.id ?? null,
        en_override: ov?.en ?? null,
        overridden: !!(ov?.id || ov?.en),
      };
    });

    if (data.search) {
      const s = data.search.toLowerCase();
      rows = rows.filter((r) => r.key.toLowerCase().includes(s));
    }
    if (data.overrideFilter === "overridden") {
      rows = rows.filter((r) => r.overridden);
    } else if (data.overrideFilter === "default") {
      rows = rows.filter((r) => !r.overridden);
    }
    if (data.limit) rows = rows.slice(0, data.limit);
    return rows;
  });

// ── Public read — fetch overrides map for the current locale ───────

export const getEffectiveOverrides = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => parseInput(PublicReadInput, i))
  .handler(async ({ data }): Promise<Record<string, string>> => {
    const { data: rows, error } = await db
      .from("i18n_overrides")
      .select("key, value")
      .eq("locale", data.locale);
    if (error) return {};
    const out: Record<string, string> = {};
    for (const r of (rows ?? []) as Array<{ key: string; value: string }>) {
      out[r.key] = r.value;
    }
    return out;
  });
