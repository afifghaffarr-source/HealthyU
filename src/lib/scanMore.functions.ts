import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============ 1, 12, 13: streak + achievements + coins ============
export const recordScanGameify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: prof } = await supabase
      .from("profiles")
      .select("scan_streak_current, scan_streak_longest, last_scan_date, health_coins")
      .eq("id", userId)
      .maybeSingle();
    let streak = prof?.scan_streak_current ?? 0;
    let longest = prof?.scan_streak_longest ?? 0;
    const last = prof?.last_scan_date;
    if (last !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      streak = last === yesterday ? streak + 1 : 1;
      longest = Math.max(longest, streak);
      await supabase
        .from("profiles")
        .update({
          scan_streak_current: streak,
          scan_streak_longest: longest,
          last_scan_date: today,
          health_coins: (prof?.health_coins ?? 0) + 5,
        })
        .eq("id", userId);
    }
    // Achievement check
    const { count: mealCount } = await supabase
      .from("meal_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    const unlocked: string[] = [];
    const checks: Array<{ id: string; ok: boolean }> = [
      { id: "scan_streak_7", ok: streak >= 7 },
      { id: "scan_streak_30", ok: streak >= 30 },
      { id: "meals_100", ok: (mealCount ?? 0) >= 100 },
      { id: "meals_500", ok: (mealCount ?? 0) >= 500 },
    ];
    for (const c of checks) {
      if (!c.ok) continue;
      const { error } = await supabase
        .from("user_achievements")
        .insert({ user_id: userId, achievement_id: c.id });
      if (!error) unlocked.push(c.id);
    }
    return { streak, longest, unlocked, coinsAwarded: last !== today ? 5 : 0 };
  });

// ============ 20: scan limit gate ============
export const checkScanLimit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: prof }, { count }] = await Promise.all([
      supabase.from("profiles").select("daily_scan_limit").eq("id", userId).maybeSingle(),
      supabase
        .from("food_scans")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", `${today}T00:00:00`),
    ]);
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("status, plan_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    const isPro = !!sub;
    const limit = isPro ? 9999 : (prof?.daily_scan_limit ?? 10);
    const used = count ?? 0;
    return { used, limit, remaining: Math.max(0, limit - used), isPro };
  });

// ============ 4: AI meal coach ============
export const mealCoachChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ message: z.string().min(1).max(1000) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI not configured");
    const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const { data: logs } = await supabase
      .from("meal_logs")
      .select("custom_name, meal_type, calories, protein_g, carbs_g, fat_g, log_date")
      .eq("user_id", userId)
      .gte("log_date", since)
      .order("log_date", { ascending: false })
      .limit(50);
    const ctx = (logs ?? [])
      .map(
        (l) =>
          `${l.log_date} ${l.meal_type}: ${l.custom_name ?? "meal"} (${l.calories}kkal P${l.protein_g} K${l.carbs_g} L${l.fat_g})`,
      )
      .join("\n");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Anda meal coach. Riwayat 7 hari user:\n${ctx || "(belum ada)"}\nJawab ringkas Bahasa Indonesia, actionable, max 3 paragraf.`,
          },
          { role: "user", content: data.message },
        ],
      }),
    });
    if (res.status === 429) throw new Error("Rate limited");
    if (res.status === 402) throw new Error("Kredit AI habis");
    if (!res.ok) throw new Error(`AI error: ${res.status}`);
    const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return { reply: j.choices?.[0]?.message?.content ?? "" };
  });

// ============ 10: compare week ============
export const compareWeeks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date();
    const startThis = new Date(today);
    startThis.setDate(today.getDate() - 6);
    const startLast = new Date(today);
    startLast.setDate(today.getDate() - 13);
    const endLast = new Date(today);
    endLast.setDate(today.getDate() - 7);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const { data } = await supabase
      .from("meal_logs")
      .select("log_date, calories, protein_g, carbs_g, fat_g")
      .eq("user_id", userId)
      .gte("log_date", fmt(startLast));
    const agg = (from: string, to: string) => {
      const f = (data ?? []).filter(
        (r) => (r.log_date as string) >= from && (r.log_date as string) <= to,
      );
      return f.reduce(
        (a, r) => ({
          cal: a.cal + Number(r.calories ?? 0),
          p: a.p + Number(r.protein_g ?? 0),
          c: a.c + Number(r.carbs_g ?? 0),
          f: a.f + Number(r.fat_g ?? 0),
        }),
        { cal: 0, p: 0, c: 0, f: 0 },
      );
    };
    return {
      thisWeek: agg(fmt(startThis), fmt(today)),
      lastWeek: agg(fmt(startLast), fmt(endLast)),
    };
  });

// ============ 14: export CSV ============
export const exportMealsCsv = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("meal_logs")
      .select("log_date, meal_type, custom_name, calories, protein_g, carbs_g, fat_g")
      .eq("user_id", userId)
      .gte("log_date", since)
      .order("log_date", { ascending: false });
    const header = "date,meal,name,calories,protein,carbs,fat";
    const escape = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const rows = (data ?? []).map((r) =>
      [
        r.log_date,
        r.meal_type,
        escape(r.custom_name),
        r.calories,
        r.protein_g,
        r.carbs_g,
        r.fat_g,
      ].join(","),
    );
    return { csv: [header, ...rows].join("\n"), count: rows.length };
  });

// ============ 15,16,17: translate + halal/vegan + allergen ============
export const classifyMealTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({ name: z.string().min(1).max(200), translate_to: z.string().length(2).optional() })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI not configured");
    const { data: prof } = await supabase
      .from("profiles")
      .select("allergies, dietary_preference")
      .eq("id", userId)
      .maybeSingle();
    const allergies = (prof?.allergies as string[] | null)?.join(", ") || "(tidak ada)";
    const diet = prof?.dietary_preference ?? "(tidak ada)";
    const prompt = `Makanan: "${data.name}". User allergies: ${allergies}. Diet: ${diet}.${
      data.translate_to ? ` Terjemahkan name ke kode bahasa "${data.translate_to}".` : ""
    } Balas JSON {"halal":true|false|null,"vegan":true|false,"vegetarian":true|false,"allergens":["..."],"allergy_warning":"...|null","translated_name":"...|null"}`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(`AI error: ${res.status}`);
    const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    try {
      return JSON.parse(j.choices?.[0]?.message?.content ?? "{}") as {
        halal?: boolean | null;
        vegan?: boolean;
        vegetarian?: boolean;
        allergens?: string[];
        allergy_warning?: string | null;
        translated_name?: string | null;
      };
    } catch {
      return {};
    }
  });

// ============ 11: group meal feed ============
export const groupMealFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ group_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: member } = await supabase
      .from("friend_group_members")
      .select("user_id")
      .eq("group_id", data.group_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) throw new Error("Bukan anggota grup");
    const { data: members } = await supabase
      .from("friend_group_members")
      .select("user_id")
      .eq("group_id", data.group_id);
    const ids = (members ?? []).map((m) => m.user_id);
    if (ids.length === 0) return { meals: [] };
    const today = new Date().toISOString().slice(0, 10);
    const { data: meals } = await supabase
      .from("meal_logs")
      .select("id, user_id, custom_name, meal_type, calories, logged_at")
      .in("user_id", ids)
      .eq("log_date", today)
      .order("logged_at", { ascending: false })
      .limit(50);
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", ids);
    const byUser: Record<string, { name: string; avatar: string | null }> = {};
    (profs ?? []).forEach(
      (p) => (byUser[p.id] = { name: p.full_name ?? "", avatar: p.avatar_url ?? null }),
    );
    return {
      meals: (meals ?? []).map((m) => ({
        ...m,
        user_name: byUser[m.user_id]?.name ?? "Anggota",
        user_avatar: byUser[m.user_id]?.avatar ?? null,
      })),
    };
  });

// ============ 19: barcode batch lookup ============
const BarcodeBatch = z.object({
  barcodes: z
    .array(
      z
        .string()
        .regex(/^[0-9]+$/)
        .min(6)
        .max(20),
    )
    .min(1)
    .max(20),
});
export const barcodeBatchLookup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => BarcodeBatch.parse(i))
  .handler(async ({ data }) => {
    const results = await Promise.all(
      data.barcodes.map(async (code) => {
        try {
          const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
          if (!r.ok) return { code, found: false };
          const j = (await r.json()) as {
            status?: number;
            product?: {
              product_name?: string;
              nutriments?: { "energy-kcal_100g"?: number };
            };
          };
          if (j.status !== 1 || !j.product) return { code, found: false };
          return {
            code,
            found: true,
            name: j.product.product_name ?? "Produk",
            calories: Number(j.product.nutriments?.["energy-kcal_100g"] ?? 0),
          };
        } catch {
          return { code, found: false };
        }
      }),
    );
    return { results };
  });
