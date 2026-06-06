import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiWithGuards, callAiJsonWithSchema } from "@/features/ai/lib/aiGateway.server";

const RemixSchema = z.object({
  title: z.string().default(""),
  ingredients: z.array(z.string()).default([]),
  instructions: z.array(z.string()).default([]),
  calories: z.number().optional(),
  protein_g: z.number().optional(),
  carbs_g: z.number().optional(),
  fat_g: z.number().optional(),
  notes: z.string().optional(),
});
export const completeDailyChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await supabase
      .from("ai_daily_challenges")
      .update({ completed: true })
      .eq("id", data.id)
      .eq("user_id", userId);
    const { data: prof } = await supabase
      .from("profiles")
      .select("health_coins")
      .eq("id", userId)
      .maybeSingle();
    await supabase
      .from("profiles")
      .update({ health_coins: (prof?.health_coins ?? 0) + 10 })
      .eq("id", userId);
    return { ok: true, coinsAwarded: 10 };
  });

// ============ 13: Recipe remix AI ============
export const remixRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { recipeId: string; substitute: string }) =>
    z.object({ recipeId: z.string().uuid(), substitute: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: r } = await supabase
      .from("recipes")
      .select("title, ingredients, instructions, calories, protein_g, carbs_g, fat_g")
      .eq("id", data.recipeId)
      .maybeSingle();
    if (!r) throw new Error("Recipe not found");
    type Remix = z.infer<typeof RemixSchema>;
    let remix: Remix | null = null;
    try {
      remix = await callAiJsonWithSchema({
        userId: context.userId,
        feature: "recipe.remix",
        schema: RemixSchema,
        fallback: { title: "", ingredients: [], instructions: [] },
        messages: [
          {
            role: "system",
            content:
              "Kamu chef. Remix resep dengan substitusi bahan. JSON: {title, ingredients[], instructions[], calories, protein_g, carbs_g, fat_g, notes}.",
          },
          {
            role: "user",
            content: `Resep:\n${JSON.stringify(r)}\nUbah/substitusi: ${data.substitute}`,
          },
        ],
      });
    } catch {}
    return { remix };
  });

// ============ 15: Grocery list from meal plan ============
export const getGroceryFromPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { mealPlanId: string }) =>
    z.object({ mealPlanId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: items } = await supabase
      .from("meal_plan_items")
      .select("food_name, recipe_id, serving_qty, serving_unit, recipes(ingredients)")
      .eq("meal_plan_id", data.mealPlanId);
    const counter = new Map<string, number>();
    type PlanItem = {
      food_name: string | null;
      serving_qty: number | null;
      recipes?: { ingredients?: string[] | null } | null;
    };
    for (const it of (items ?? []) as PlanItem[]) {
      const ings: string[] = it.recipes?.ingredients ?? [];
      for (const ing of ings) {
        const key = ing.toLowerCase().trim();
        counter.set(key, (counter.get(key) ?? 0) + Number(it.serving_qty ?? 1));
      }
      if (it.food_name && !ings.length) {
        const key = it.food_name.toLowerCase();
        counter.set(key, (counter.get(key) ?? 0) + Number(it.serving_qty ?? 1));
      }
    }
    const list = Array.from(counter.entries())
      .map(([item, qty]) => ({ item, qty }))
      .sort((a, b) => a.item.localeCompare(b.item));
    return { list };
  });

// ============ 19: AI Doctor chat ============
export const doctorChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { message: string }) =>
    z.object({ message: z.string().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: meds } = await supabase
      .from("medications")
      .select("name, dosage, frequency")
      .eq("user_id", userId);
    const { data: cond } = await supabase
      .from("user_health_conditions")
      .select("condition_name, severity")
      .eq("user_id", userId);
    const { data: allergies } = await supabase
      .from("user_allergies")
      .select("allergen, severity")
      .eq("user_id", userId);
    const ctx = `Medications: ${JSON.stringify(meds ?? [])}\nConditions: ${JSON.stringify(cond ?? [])}\nAlergi: ${JSON.stringify(allergies ?? [])}`;
    const reply = await callAiWithGuards({
      userId,
      feature: "doctor.chat",
      messages: [
        {
          role: "system",
          content:
            "Kamu AI health advisor (BUKAN dokter). Berikan info edukasi singkat & sarankan konsultasi tenaga medis. Bahasa Indonesia. Pertimbangkan konteks pengguna.",
        },
        { role: "system", content: ctx },
        { role: "user", content: data.message },
      ],
    });
    return { reply };
  });
