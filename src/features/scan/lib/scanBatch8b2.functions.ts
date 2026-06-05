import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { makeScanAiCaller } from "./scanCallAi.server";

const callAI = makeScanAiCaller("scanBatch8");

export const shouldSuggestFreeze = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: p } = await supabase
      .from("profiles")
      .select("last_scan_date, scan_streak_current, health_coins, streak_freeze_used_at")
      .eq("id", userId)
      .maybeSingle();
    const today = new Date().toISOString().slice(0, 10);
    const hour = new Date().getHours();
    const noScanToday = p?.last_scan_date !== today;
    const canAfford = (p?.health_coins ?? 0) >= 30;
    const notUsedToday = p?.streak_freeze_used_at !== today;
    const goodStreak = (p?.scan_streak_current ?? 0) >= 3;
    const suggest = noScanToday && canAfford && notUsedToday && goodStreak && hour >= 20;
    return { suggest, streak: p?.scan_streak_current ?? 0 };
  });

export const createFamilyInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { planId: string }) => z.object({ planId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const { data: inserted } = await supabase
      .from("family_invites")
      .insert({ plan_id: data.planId, token, created_by: userId })
      .select()
      .single();
    return { invite: inserted };
  });

export const redeemFamilyInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { token: string }) =>
    z.object({ token: z.string().min(5).max(100) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: inv } = await supabase
      .from("family_invites")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();
    if (!inv) throw new Error("Invite tidak valid");
    if (inv.used_by) throw new Error("Sudah dipakai");
    if (new Date(inv.expires_at) < new Date()) throw new Error("Kadaluarsa");
    await supabase.from("family_plan_members").insert({ plan_id: inv.plan_id, user_id: userId });
    await supabase
      .from("family_invites")
      .update({ used_by: userId, used_at: new Date().toISOString() })
      .eq("id", inv.id);
    return { planId: inv.plan_id };
  });

export const createDoctorReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reason: string }) =>
    z.object({ reason: z.string().min(5).max(500) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const analysis = await callAI(
      `Pasien: "${data.reason}". Tentukan urgency (low/medium/high) dan spesialis yang direkomendasikan. Format JSON: {urgency, specialist, notes}.`,
      "Kamu triage assistant.",
    );
    type ReferralParsed = { urgency?: string; specialist?: string; notes?: string };
    let parsed: ReferralParsed = {};
    try {
      parsed = JSON.parse(analysis.replace(/```json|```/g, "").trim()) as ReferralParsed;
    } catch {
      parsed = { urgency: "low", specialist: "General Practitioner", notes: analysis };
    }
    const { data: inserted } = await supabase
      .from("doctor_referrals")
      .insert({
        user_id: userId,
        reason: data.reason,
        urgency: parsed.urgency ?? "low",
        recommended_specialist: parsed.specialist,
        notes: parsed.notes,
      })
      .select()
      .single();
    return { referral: inserted };
  });

export const smartShoppingList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ingredients: string[] }) =>
    z.object({ ingredients: z.array(z.string().min(1).max(80)).min(1).max(40) }).parse(d),
  )
  .handler(async ({ data }) => {
    const text = await callAI(
      `Estimasi harga pasar Indonesia (IDR) untuk: ${data.ingredients.join(", ")}. Format JSON array: [{item, qty, price_idr}]. Hanya JSON.`,
      "Kamu shopping assistant Indonesia.",
    );
    type ShopItem = { item: string; qty: string | number; price_idr: number };
    let items: ShopItem[] = [];
    try {
      const raw = JSON.parse(text.replace(/```json|```/g, "").trim());
      items = Array.isArray(raw) ? (raw as ShopItem[]) : [];
    } catch {
      items = data.ingredients.map((i) => ({ item: i, qty: "1", price_idr: 10000 }));
    }
    const total = items.reduce<number>((s, it) => s + (it.price_idr ?? 0), 0);
    return { items, total };
  });

export const logMeditation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { durationMin: number; type?: string }) =>
    z
      .object({
        durationMin: z.number().int().min(1).max(120),
        type: z.string().max(30).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await supabase.from("meditation_sessions").insert({
      user_id: userId,
      duration_min: data.durationMin,
      type: data.type ?? "breathing",
    });
    return { ok: true };
  });

export const listMeditations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("meditation_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(20);
    return { sessions: data ?? [] };
  });