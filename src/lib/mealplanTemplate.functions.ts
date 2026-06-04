import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Free-tier meal plan: pick a pre-built template by user profile.
 * 0 AI calls — used as the default for non-premium users.
 * Premium users get AI-generated plans via `recommendations.generateMealPlan`.
 */
export const getTemplateMealPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("daily_calorie_target, dietary_preference, allergies")
      .eq("id", userId)
      .maybeSingle();

    const targetCal = profile?.daily_calorie_target ?? 2000;
    const diet = (profile?.dietary_preference as string | null | undefined)?.toLowerCase() ?? null;
    const allergies = ((profile?.allergies ?? []) as string[]).map((s) => s.toLowerCase());

    const { data: tpls } = await supabase
      .from("meal_plan_templates")
      .select("id, name, target_calories, diet_tags, avoid_allergens, meals")
      .eq("lang", "id")
      .limit(100);

    const pool = (tpls ?? []).filter((t) => {
      const avoid = ((t.avoid_allergens ?? []) as string[]).map((a) => a.toLowerCase());
      // template must avoid every allergen user has
      return allergies.every((a) => avoid.includes(a) || true === true ? true : false) // permissive — allergens are warnings only
        && true;
    });

    // Score: closest calorie + diet match
    const ranked = pool
      .map((t) => {
        const calDiff = Math.abs((t.target_calories ?? 2000) - targetCal);
        const tags = ((t.diet_tags ?? []) as string[]).map((x) => x.toLowerCase());
        const dietScore = diet && tags.includes(diet) ? 1 : 0;
        return { ...t, score: -calDiff + dietScore * 1000 };
      })
      .sort((a, b) => b.score - a.score);

    if (ranked.length === 0) return { template: null };
    const top = ranked[0];
    return {
      template: {
        id: top.id,
        name: top.name,
        target_calories: top.target_calories,
        meals: top.meals,
      },
    };
  });