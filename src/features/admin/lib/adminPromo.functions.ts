/**
 * Admin Promo Codes + Banners — server fns.
 *
 * Tables (not in generated types): promo_codes, banners, promo_redemptions.
 * Cast supabaseAdmin to `any` for these tables (Sprint 57 pattern).
 *
 * Admin fns: list/create/update/delete.
 * Public fns: redeemPromoCode (uses SECURITY DEFINER RPC), getActiveBanners (RPC).
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

export type PromoRow = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  reward_type: "coins" | "xp" | "premium_days";
  reward_value: number;
  max_uses: number;
  uses_remaining: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type BannerRow = {
  id: string;
  placement: "top" | "middle" | "bottom";
  title: string;
  description: string | null;
  cta_label: string | null;
  cta_href: string | null;
  color: string;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
};

// ── Schemas ─────────────────────────────────────────────────────────

const RewardTypeSchema = z.enum(["coins", "xp", "premium_days"]);
const PlacementSchema = z.enum(["top", "middle", "bottom"]);

const CreatePromoSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(50)
    .transform((s) => s.toUpperCase()),
  label: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  reward_type: RewardTypeSchema,
  reward_value: z.number().int().min(0),
  max_uses: z.number().int().min(1).max(100000),
  expires_at: z.string().datetime().optional().nullable(),
});

const UpdatePromoSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1).max(50).optional(),
  label: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  reward_type: RewardTypeSchema.optional(),
  reward_value: z.number().int().min(0).optional(),
  max_uses: z.number().int().min(1).max(100000).optional(),
  is_active: z.boolean().optional(),
  expires_at: z.string().datetime().optional().nullable(),
});

const DeletePromoSchema = z.object({ id: z.string().uuid() });

const CreateBannerSchema = z.object({
  placement: PlacementSchema,
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  cta_label: z.string().max(50).optional().nullable(),
  cta_href: z.string().max(200).optional().nullable(),
  color: z.string().min(1).max(30).default("amber"),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional().nullable(),
});

const UpdateBannerSchema = z.object({
  id: z.string().uuid(),
  placement: PlacementSchema.optional(),
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  cta_label: z.string().max(50).optional().nullable(),
  cta_href: z.string().max(200).optional().nullable(),
  color: z.string().min(1).max(30).optional(),
  is_active: z.boolean().optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional().nullable(),
});

const DeleteBannerSchema = z.object({ id: z.string().uuid() });

// ── Admin: Promo Codes ──────────────────────────────────────────────

export const listPromosAdmin = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .handler(async ({ context }): Promise<PromoRow[]> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);
    const { data, error } = await db
      .from("promo_codes")
      .select(
        "id,code,label,description,reward_type,reward_value,max_uses,uses_remaining,expires_at,is_active,created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(`listPromos: ${error.message}`);
    return (data ?? []) as PromoRow[];
  });

export const createPromoAdmin = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .inputValidator((i: unknown) => parseInput(CreatePromoSchema, i))
  .handler(async ({ data, context }): Promise<PromoRow> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);
    const { data: row, error } = await db
      .from("promo_codes")
      .insert({
        ...data,
        uses_remaining: data.max_uses,
        created_by: userId,
      })
      .select(
        "id,code,label,description,reward_type,reward_value,max_uses,uses_remaining,expires_at,is_active,created_at",
      )
      .single();
    if (error) throw new Error(`createPromo: ${error.message}`);
    return row as PromoRow;
  });

export const updatePromoAdmin = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .inputValidator((i: unknown) => parseInput(UpdatePromoSchema, i))
  .handler(async ({ data, context }): Promise<PromoRow> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);
    const { id, ...patch } = data;
    const update: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
    if (patch.max_uses !== undefined) {
      // Recalculate uses_remaining when max_uses changes
      update.uses_remaining = patch.max_uses;
    }
    const { data: row, error } = await db
      .from("promo_codes")
      .update(update)
      .eq("id", id)
      .select(
        "id,code,label,description,reward_type,reward_value,max_uses,uses_remaining,expires_at,is_active,created_at",
      )
      .single();
    if (error) throw new Error(`updatePromo: ${error.message}`);
    return row as PromoRow;
  });

export const deletePromoAdmin = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .inputValidator((i: unknown) => parseInput(DeletePromoSchema, i))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);
    const { error } = await db.from("promo_codes").delete().eq("id", data.id);
    if (error) throw new Error(`deletePromo: ${error.message}`);
    return { ok: true };
  });

// ── Admin: Banners ──────────────────────────────────────────────────

export const listBannersAdmin = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .handler(async ({ context }): Promise<BannerRow[]> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);
    const { data, error } = await db
      .from("banners")
      .select(
        "id,placement,title,description,cta_label,cta_href,color,starts_at,ends_at,is_active,created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(`listBanners: ${error.message}`);
    return (data ?? []) as BannerRow[];
  });

export const createBannerAdmin = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .inputValidator((i: unknown) => parseInput(CreateBannerSchema, i))
  .handler(async ({ data, context }): Promise<BannerRow> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);
    const { data: row, error } = await db
      .from("banners")
      .insert({
        ...data,
        created_by: userId,
      })
      .select(
        "id,placement,title,description,cta_label,cta_href,color,starts_at,ends_at,is_active,created_at",
      )
      .single();
    if (error) throw new Error(`createBanner: ${error.message}`);
    return row as BannerRow;
  });

export const updateBannerAdmin = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .inputValidator((i: unknown) => parseInput(UpdateBannerSchema, i))
  .handler(async ({ data, context }): Promise<BannerRow> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);
    const { id, ...patch } = data;
    const { data: row, error } = await db
      .from("banners")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(
        "id,placement,title,description,cta_label,cta_href,color,starts_at,ends_at,is_active,created_at",
      )
      .single();
    if (error) throw new Error(`updateBanner: ${error.message}`);
    return row as BannerRow;
  });

export const deleteBannerAdmin = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .inputValidator((i: unknown) => parseInput(DeleteBannerSchema, i))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);
    const { error } = await db.from("banners").delete().eq("id", data.id);
    if (error) throw new Error(`deleteBanner: ${error.message}`);
    return { ok: true };
  });

// ── Public: Redeem Promo Code ───────────────────────────────────────

const RedeemSchema = z.object({ code: z.string().min(1).max(50) });

export type RedeemResult = {
  success: boolean;
  reward_type: string | null;
  reward_value: number | null;
  message: string;
  label: string | null;
};

export const redeemPromoCode = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .inputValidator((i: unknown) => parseInput(RedeemSchema, i))
  .handler(async ({ data, context }): Promise<RedeemResult> => {
    const { userId } = context as { userId: string };
    const { data: result, error } = await supabaseAdmin.rpc(
      "redeem_promo" as never,
      {
        _code: data.code.toUpperCase(),
        _user_id: userId,
      } as never,
    );
    if (error) throw new Error(`redeemPromo: ${error.message}`);
    return (result ?? {
      success: false,
      reward_type: null,
      reward_value: null,
      message: "Gagal menukar kode",
      label: null,
    }) as RedeemResult;
  });

// ── Public: Get Active Banners ──────────────────────────────────────

const GetBannersSchema = z
  .object({
    placement: z.enum(["top", "middle", "bottom"]).optional(),
  })
  .optional();

export type ActiveBanner = {
  id: string;
  placement: string;
  title: string;
  description: string | null;
  cta_label: string | null;
  cta_href: string | null;
  color: string;
};

export const getActiveBanners = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => parseInput(GetBannersSchema, i))
  .handler(async ({ data }): Promise<ActiveBanner[]> => {
    const { data: rows, error } = await supabaseAdmin.rpc(
      "get_active_banners" as never,
      {
        _position: data?.placement ?? null,
      } as never,
    );
    if (error) throw new Error(`getActiveBanners: ${error.message}`);
    return (rows ?? []) as unknown as ActiveBanner[];
  });

// ── Admin: Promo Stats (Sprint 58-C) ────────────────────────────────
// Aggregate counts for the admin overview: total/active promo codes and
// total/unique redemption counts. Admin-only (uses ensureAdmin).

export type PromoStats = {
  total_codes: number;
  active_codes: number;
  total_redemptions: number;
  unique_redeemers: number;
};

export const getPromoStatsAdmin = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .handler(async ({ context }): Promise<PromoStats> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);

    // Three of the four counts are simple count(*) / count(*) WHERE
    // queries, run in parallel via head+count.
    const [totalRes, activeRes, redemptionsRes] = await Promise.all([
      db.from("promo_codes").select("*", { count: "exact", head: true }),
      db.from("promo_codes").select("*", { count: "exact", head: true }).eq("is_active", true),
      db.from("promo_redemptions").select("*", { count: "exact", head: true }),
    ]);

    if (totalRes.error) throw new Error(`getPromoStats total: ${totalRes.error.message}`);
    if (activeRes.error) throw new Error(`getPromoStats active: ${activeRes.error.message}`);
    if (redemptionsRes.error)
      throw new Error(`getPromoStats redemptions: ${redemptionsRes.error.message}`);

    // Unique redeemers needs count(distinct user_id). PostgREST can't express
    // COUNT(DISTINCT) in a head-only call, so we fetch the column and dedupe
    // locally. The promo_redemptions table on the free plan is tiny.
    const { data: distinctUsers, error: distinctErr } = await db
      .from("promo_redemptions")
      .select("user_id");
    if (distinctErr) throw new Error(`getPromoStats distinct: ${distinctErr.message}`);
    const uniqueCount = new Set(
      (distinctUsers ?? [])
        .map((r: { user_id: string }) => r.user_id)
        .filter((u: string | null): u is string => u != null),
    ).size;

    return {
      total_codes: totalRes.count ?? 0,
      active_codes: activeRes.count ?? 0,
      total_redemptions: redemptionsRes.count ?? 0,
      unique_redeemers: uniqueCount,
    };
  });
