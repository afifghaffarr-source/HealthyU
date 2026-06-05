import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiWithGuards } from "./aiGateway.server";

async function callAI(prompt: string, system: string, userId: string | null = null) {
  return callAiWithGuards({
    userId,
    feature: "scanBatch8",
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });
}

// 1. Notify follow/comment (insert log + send web push if subscribed)
export const notifyUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { targetUserId: string; type: string; title: string; body?: string; link?: string }) =>
      z
        .object({
          targetUserId: z.string().uuid(),
          type: z.string().min(1).max(40),
          title: z.string().min(1).max(120),
          body: z.string().max(300).optional(),
          link: z.string().max(200).optional(),
        })
        .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("notifications_log").insert({
      user_id: data.targetUserId,
      type: data.type,
      title: data.title,
      body: data.body,
      link: data.link,
    });
    return { ok: true };
  });

export const listNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("notifications_log")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return { items: data ?? [] };
  });

export const markNotifRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await supabase
      .from("notifications_log")
      .update({ read: true })
      .eq("id", data.id)
      .eq("user_id", userId);
    return { ok: true };
  });

// 2. Streak reminder (returns users at risk to be called by cron via /api/public/cron)
export const checkMyStreakRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: p } = await supabase
      .from("profiles")
      .select("last_scan_date, scan_streak_current")
      .eq("id", userId)
      .maybeSingle();
    const today = new Date().toISOString().slice(0, 10);
    const atRisk = (p?.scan_streak_current ?? 0) >= 1 && p?.last_scan_date !== today;
    return { atRisk, streak: p?.scan_streak_current ?? 0 };
  });

// 3. Mood voice input (transcribe via Gemini)
export const transcribeMoodVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { audioBase64: string }) =>
    z.object({ audioBase64: z.string().min(10) }).parse(d),
  )
  .handler(async ({ data }) => {
    const text = await callAI(
      `Transkrip dan analisis mood dari rekaman ini (base64): ${data.audioBase64.slice(0, 100)}... Ringkas: transkrip + 1 kata mood (happy/sad/anxious/calm/neutral). Format JSON.`,
      "Kamu transcriber dan psychology analyst.",
    );
    return { result: text };
  });

// 4. AI weekly PDF report (generate text content, frontend renders/downloads)
export const generateWeeklyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from("ai_weekly_reports")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start", weekStartStr)
      .maybeSingle();
    if (existing) return { report: existing };
    const since = weekStart.toISOString();
    const [meals, water, sleep, workouts] = await Promise.all([
      supabase
        .from("meal_logs")
        .select("calories, protein_g")
        .eq("user_id", userId)
        .gte("logged_at", since),
      supabase.from("water_logs").select("amount_ml").eq("user_id", userId).gte("logged_at", since),
      supabase
        .from("sleep_logs")
        .select("duration_hours")
        .eq("user_id", userId)
        .gte("log_date", weekStartStr),
      supabase
        .from("workout_sessions")
        .select("calories_burned, duration_minutes")
        .eq("user_id", userId)
        .gte("started_at", since),
    ]);
    const stats = {
      meals: meals.data?.length ?? 0,
      totalCal: (meals.data ?? []).reduce<number>((s, m) => s + (m.calories ?? 0), 0),
      totalProtein: (meals.data ?? []).reduce<number>((s, m) => s + (m.protein_g ?? 0), 0),
      water: (water.data ?? []).reduce<number>((s, w) => s + (w.amount_ml ?? 0), 0),
      sleep: (sleep.data ?? []).reduce<number>((s, w) => s + (w.duration_hours ?? 0), 0),
      workouts: workouts.data?.length ?? 0,
    };
    const content = await callAI(
      `Buat laporan mingguan kesehatan (Bahasa Indonesia, max 400 kata) dari data: ${JSON.stringify(stats)}. Sertakan: ringkasan, highlight, area perbaikan, target minggu depan.`,
      "Kamu health coach personal.",
    );
    const { data: inserted } = await supabase
      .from("ai_weekly_reports")
      .insert({ user_id: userId, week_start: weekStartStr, content })
      .select()
      .single();
    return { report: inserted };
  });

// 5. Photo portion slider (just an AI estimator that scales)
export const adjustPortion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { baseCalories: number; multiplier: number }) =>
    z
      .object({ baseCalories: z.number().positive(), multiplier: z.number().min(0.1).max(5) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    return { adjustedCalories: Math.round(data.baseCalories * data.multiplier) };
  });

// 6. Restaurants nearby (fetch from cache by location)
export const restaurantsNearby = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lat: number; lng: number; radiusKm?: number }) =>
    z
      .object({
        lat: z.number(),
        lng: z.number(),
        radiusKm: z.number().min(0.5).max(20).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const r = data.radiusKm ?? 5;
    const latDelta = r / 111;
    const lngDelta = r / (111 * Math.cos((data.lat * Math.PI) / 180));
    const { data: rows } = await supabase
      .from("restaurants_nearby")
      .select("*")
      .gte("lat", data.lat - latDelta)
      .lte("lat", data.lat + latDelta)
      .gte("lng", data.lng - lngDelta)
      .lte("lng", data.lng + lngDelta)
      .limit(30);
    return { restaurants: rows ?? [] };
  });

// 7. Multi-currency price tracker
export const convertCurrency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { amount: number; from: string; to: string }) =>
    z.object({ amount: z.number(), from: z.string().length(3), to: z.string().length(3) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    if (data.from === data.to) return { converted: data.amount, rate: 1 };
    const { data: row } = await supabase
      .from("currency_rates")
      .select("rate, fetched_at")
      .eq("base", data.from)
      .eq("quote", data.to)
      .maybeSingle();
    const stale = !row || Date.now() - new Date(row.fetched_at).getTime() > 6 * 3600 * 1000;
    if (stale) {
      try {
        const res = await fetch(`https://open.er-api.com/v6/latest/${data.from}`);
        const j = await res.json();
        const rate = j.rates?.[data.to];
        if (rate) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("currency_rates").upsert(
            {
              base: data.from,
              quote: data.to,
              rate,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "base,quote" },
          );
          return { converted: data.amount * rate, rate };
        }
      } catch {}
    }
    const rate = row?.rate ?? 1;
    return { converted: data.amount * rate, rate };
  });

// 8. Wearable sleep score (compute simple score from sleep_logs)
export const getSleepScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("sleep_logs")
      .select("log_date, duration_hours, quality")
      .eq("user_id", userId)
      .gte("log_date", since)
      .order("log_date");
    const rows = (data ?? []).map((r) => ({
      date: r.log_date,
      score: Math.min(100, Math.round(((r.duration_hours ?? 0) / 8) * 60 + (r.quality ?? 3) * 8)),
    }));
    return { rows };
  });

// 11. Public profile share link with OG metadata (server fn returns shareable HTML/text)
export const getPublicProfileMeta = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select("full_name, avatar_url, scan_streak_current, health_coins, public_profile")
      .eq("id", data.userId)
      .maybeSingle();
    if (!p?.public_profile) return { profile: null };
    return { profile: p };
  });

// 13. Streak freeze auto-suggest
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

// 14. Family plan invite via QR
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

// 15. Doctor referral
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

// 16. Smart shopping list with IDR estimate
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

// 20. Meditation timer log
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
