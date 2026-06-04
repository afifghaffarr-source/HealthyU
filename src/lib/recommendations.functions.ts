import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Lightweight content personalization: score published articles & recipes
 * against user profile (goals, conditions, dietary_preference, BMI). No AI
 * call — pure ranking on already-loaded rows.
 */
export const getRecommendedContent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("dietary_preference, health_conditions, bmi_category, daily_calorie_target")
      .eq("id", userId)
      .maybeSingle();

    const conds = (profile?.health_conditions ?? []).map((c) => c.toLowerCase());
    const diet = (profile?.dietary_preference ?? "").toLowerCase();
    const bmiCat = (profile?.bmi_category ?? "").toLowerCase();
    const calTarget = profile?.daily_calorie_target ?? 0;

    const [{ data: arts }, { data: recs }, { data: schedule }] = await Promise.all([
      supabase
        .from("articles")
        .select("id, slug, title, excerpt, image_url, category, tags, target_conditions, target_goals, reading_time_minutes, is_featured, published_at")
        .eq("is_published", true)
        .is("deleted_at", null)
        .order("published_at", { ascending: false })
        .limit(60),
      supabase
        .from("recipes")
        .select("id, slug, title, description, category, calories, tags, is_vegetarian, is_vegan, is_keto_friendly, is_halal, image_url, avg_rating, save_count")
        .eq("is_published", true)
        .is("deleted_at", null)
        .order("save_count", { ascending: false })
        .limit(60),
      supabase
        .from("daily_content_schedule")
        .select("content_type, content_id, theme")
        .eq("schedule_date", new Date().toISOString().slice(0, 10)),
    ]);

    const todayIds = new Set((schedule ?? []).map((s) => s.content_id));

    function scoreArticle(a: NonNullable<typeof arts>[number]): number {
      let s = 0;
      if (todayIds.has(a.id)) s += 50;
      if (a.is_featured) s += 10;
      const tags = Array.isArray(a.tags) ? (a.tags as unknown[]).map(String) : [];
      const targets = Array.isArray(a.target_conditions)
        ? (a.target_conditions as unknown[]).map(String).map((x) => x.toLowerCase())
        : [];
      for (const c of conds) if (targets.includes(c) || tags.some((t) => t.toLowerCase().includes(c))) s += 15;
      if (bmiCat === "overweight" || bmiCat === "obese") {
        if (a.category === "diet" || a.category === "fitness") s += 8;
      }
      if (bmiCat === "underweight" && a.category === "nutrition") s += 8;
      if (diet && (tags.map((t) => t.toLowerCase()).includes(diet))) s += 5;
      return s;
    }

    function scoreRecipe(r: NonNullable<typeof recs>[number]): number {
      let s = 0;
      if (todayIds.has(r.id)) s += 50;
      s += Math.min(20, (r.avg_rating ?? 0) * 4);
      if (diet === "vegetarian" && r.is_vegetarian) s += 12;
      if (diet === "vegan" && r.is_vegan) s += 14;
      if (diet === "keto" && r.is_keto_friendly) s += 14;
      if (diet === "halal" && r.is_halal) s += 6;
      if (calTarget > 0 && r.calories > 0) {
        const portion = calTarget / 3; // ~per meal
        const diff = Math.abs(r.calories - portion) / portion;
        if (diff < 0.3) s += 10;
        else if (diff < 0.5) s += 5;
      }
      if (bmiCat === "overweight" || bmiCat === "obese") {
        if (r.calories > 0 && r.calories < 450) s += 6;
      }
      return s;
    }

    const articles = (arts ?? [])
      .map((a) => ({ ...a, _score: scoreArticle(a) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 12);

    const recipes = (recs ?? [])
      .map((r) => ({ ...r, _score: scoreRecipe(r) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 12);

    return {
      today_theme: schedule?.[0]?.theme ?? null,
      articles,
      recipes,
    };
  });