import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiWithGuards, callAiJsonWithSchema } from "@/features/ai/lib/aiGateway.server";
import { logServerError } from "@/lib/logger.server";

const MealTagsSchema = z.object({
  halal: z.union([z.boolean(), z.null()]).optional(),
  vegan: z.boolean().optional(),
  vegetarian: z.boolean().optional(),
  allergens: z.array(z.string()).default([]),
  allergy_warning: z.union([z.string(), z.null()]).optional(),
  translated_name: z.union([z.string(), z.null()]).optional(),
});

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

// ===== from scanMore1 (mealCoachChat) =====

export const mealCoachChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ message: z.string().min(1).max(1000) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
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
    const reply = await callAiWithGuards({
      userId,
      feature: "meal.coach.chat",
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Anda meal coach. Riwayat 7 hari user:\n${ctx || "(belum ada)"}\nJawab ringkas Bahasa Indonesia, actionable, max 3 paragraf.`,
        },
        { role: "user", content: data.message },
      ],
    });
    return { reply };
  });

// ===== from scanMore2 (classifyMealTags, groupMealFeed) =====

export const classifyMealTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({ name: z.string().min(1).max(200), translate_to: z.string().length(2).optional() })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
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
    return await callAiJsonWithSchema({
      userId,
      feature: "meal.classify.tags",
      model: "google/gemini-2.5-flash",
      schema: MealTagsSchema,
      fallback: { allergens: [] },
      messages: [{ role: "user", content: prompt }],
    });
  });

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

// ===== from scanExtras2 (relogMeal, recommendRecipes) =====

export const relogMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().min(1).max(200),
        calories: z.number().min(0).max(5000),
        protein_g: z.number().min(0).max(500).optional(),
        carbs_g: z.number().min(0).max(1000).optional(),
        fat_g: z.number().min(0).max(500).optional(),
        meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
        portion_g: z.number().min(0).max(5000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("meal_logs").insert({
      user_id: userId,
      custom_name: data.name,
      calories: data.calories,
      protein_g: data.protein_g ?? 0,
      carbs_g: data.carbs_g ?? 0,
      fat_g: data.fat_g ?? 0,
      meal_type: data.meal_type,
      serving_qty: 1,
      source: "quick_relog",
      log_date: new Date().toISOString().slice(0, 10),
      logged_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recommendRecipes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: prof }, { data: logs }] = await Promise.all([
      supabase.from("profiles").select("daily_calorie_target").eq("id", userId).maybeSingle(),
      supabase.from("meal_logs").select("calories").eq("user_id", userId).eq("log_date", today),
    ]);
    const target = Number(prof?.daily_calorie_target ?? 2000);
    const consumed = (logs ?? []).reduce((s, r) => s + Number(r.calories ?? 0), 0);
    const remaining = Math.max(0, target - consumed);
    const max = Math.round(remaining + 100);
    const min = Math.max(0, Math.round(remaining - 200));
    const { data: recipes, error } = await supabase
      .from("recipes")
      .select("id, title, calories, image_url, prep_min")
      .gte("calories", min)
      .lte("calories", max)
      .limit(10);
    if (error) throw new Error(error.message);
    return { remaining, recipes: recipes ?? [] };
  });

// ===== from scanSocialA2 (remixRecipe, getGroceryFromPlan) =====

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
    } catch (e) {
      // Recipe remix fell through to AI parsing but the response was
      // malformed. We still return { remix } (possibly empty/undefined)
      // so the UI can show a friendly fallback. Logged for debugging.
      logServerError("scanMeal.remixRecipe", e, { stage: "ai-parse" });
    }
    return { remix };
  });

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
