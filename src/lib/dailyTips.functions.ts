import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ageFromBirthDate } from "@/lib/localCalc";

/**
 * Pick a daily tip from the precomputed pool — 0 AI calls.
 * Stable per (user, YYYY-MM-DD) so the same tip appears all day.
 */
export const getDailyTip = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("birth_date, health_conditions, dietary_preference")
      .eq("id", userId)
      .maybeSingle();

    const age = ageFromBirthDate(profile?.birth_date as string | null | undefined);
    const conditions = ((profile?.health_conditions ?? []) as string[]).map((s) => s.toLowerCase());
    const diet = (profile?.dietary_preference as string | null | undefined)?.toLowerCase() ?? null;

    let query = supabase
      .from("daily_tips_pool")
      .select("id, category, tip, target_conditions, target_tags, weight, min_age, max_age")
      .eq("lang", "id")
      .limit(200);
    const { data: rows } = await query;
    const pool = rows ?? [];
    if (pool.length === 0) {
      return { tip: "Minum air putih minimal 8 gelas hari ini.", category: "hydration" };
    }

    // Score & filter
    const matched = pool
      .map((r) => {
        if (r.min_age && age && age < r.min_age) return null;
        if (r.max_age && age && age > r.max_age) return null;
        let score = r.weight ?? 1;
        const conds = (r.target_conditions ?? []) as string[];
        const tags = (r.target_tags ?? []) as string[];
        if (conds.length && conds.some((c) => conditions.includes(c.toLowerCase()))) score += 5;
        if (diet && tags.some((t) => t.toLowerCase() === diet)) score += 3;
        return { ...r, score };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);

    // Deterministic pick per (user, day)
    const today = new Date().toISOString().slice(0, 10);
    const seedStr = `${userId}-${today}`;
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) | 0;

    const ranked = matched.length ? matched : pool.map((r) => ({ ...r, score: 1 }));
    const total = ranked.reduce((s, r) => s + r.score, 0);
    let target = Math.abs(seed) % Math.max(1, total);
    for (const r of ranked) {
      target -= r.score;
      if (target < 0) return { tip: r.tip, category: r.category };
    }
    return { tip: ranked[0].tip, category: ranked[0].category };
  });
