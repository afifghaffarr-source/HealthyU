import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  meal_types: z.array(z.enum(["breakfast", "lunch", "dinner", "snack"])).default(["breakfast", "lunch", "dinner", "snack"]),
  notes: z.string().max(300).optional(),
});

export const generateMealPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI tidak tersedia");

    const today = new Date();
    const start = new Date(today); start.setHours(0, 0, 0, 0);

    const [profileRes, todayMeals, foodsRes] = await Promise.all([
      supabase.from("profiles").select("full_name, gender, birth_date, height_cm, weight_kg, target_weight_kg, activity_level, daily_calorie_target, dietary_preference, allergies, health_conditions").eq("id", userId).maybeSingle(),
      supabase.from("meal_logs").select("calories, protein_g, carbs_g, fat_g").eq("user_id", userId).gte("logged_at", start.toISOString()),
      supabase.from("food_items").select("id, name, category, calories, protein_g, carbs_g, fat_g, serving_size, serving_unit, allergens, tags").eq("is_indonesian", true).order("popularity_score", { ascending: false }).limit(120),
    ]);

    const profile = profileRes.data;
    const allergies = (profile?.allergies ?? []) as string[];
    const consumedCal = (todayMeals.data ?? []).reduce((s, m) => s + Number(m.calories || 0), 0);
    const consumedP = (todayMeals.data ?? []).reduce((s, m) => s + Number(m.protein_g || 0), 0);
    const consumedC = (todayMeals.data ?? []).reduce((s, m) => s + Number(m.carbs_g || 0), 0);
    const consumedF = (todayMeals.data ?? []).reduce((s, m) => s + Number(m.fat_g || 0), 0);
    const targetCal = profile?.daily_calorie_target ?? 2000;
    const remaining = Math.max(200, targetCal - consumedCal);

    const lowerAllergies = allergies.map((a) => a.toLowerCase());
    const safeFoods = (foodsRes.data ?? []).filter((f) => {
      const al = (f.allergens ?? []) as string[];
      return !al.some((x) => lowerAllergies.includes(x.toLowerCase()));
    }).slice(0, 60);

    const menuStr = safeFoods.map((f) => `${f.id}|${f.name}|${f.calories}kcal|P${f.protein_g}/C${f.carbs_g}/F${f.fat_g}`).join("\n");

    const userPayload = {
      profile: {
        gender: profile?.gender,
        weight_kg: profile?.weight_kg,
        target_weight_kg: profile?.target_weight_kg,
        height_cm: profile?.height_cm,
        activity_level: profile?.activity_level,
        dietary_preference: profile?.dietary_preference,
        health_conditions: profile?.health_conditions,
        allergies,
      },
      today_so_far: { calories: Math.round(consumedCal), protein_g: Math.round(consumedP), carbs_g: Math.round(consumedC), fat_g: Math.round(consumedF) },
      remaining_budget_kcal: Math.round(remaining),
      requested_meals: data.meal_types,
      user_notes: data.notes ?? null,
    };

    const schema = {
      type: "object",
      properties: {
        meals: {
          type: "array",
          items: {
            type: "object",
            properties: {
              meal_type: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
              food_item_id: { type: "string", description: "UUID dari menu di atas, atau null jika custom" },
              name: { type: "string" },
              planned_qty: { type: "number" },
              calories: { type: "number" },
              protein_g: { type: "number" },
              carbs_g: { type: "number" },
              fat_g: { type: "number" },
              reason: { type: "string", description: "Alasan singkat kenapa cocok" },
            },
            required: ["meal_type", "name", "planned_qty", "calories", "reason"],
          },
        },
        summary: { type: "string", description: "Ringkasan singkat strategi hari ini (2-3 kalimat)" },
      },
      required: ["meals", "summary"],
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Kamu adalah AI nutrisi Dr. HealthyU. Buat rekomendasi meal plan harian dari menu Indonesia. Aturan:\n- HINDARI alergen dan sesuaikan dengan kondisi kesehatan user\n- Total kalori semua meals MENDEKATI remaining_budget_kcal (±10%)\n- Distribusi makro seimbang (P:25%, C:50%, F:25%) kecuali user diet khusus\n- Pilih dari menu yang disediakan jika ada (gunakan UUID), atau custom dengan food_item_id=null\n- Beri alasan singkat & praktis dalam Bahasa Indonesia`,
          },
          {
            role: "user",
            content: `Data user:\n${JSON.stringify(userPayload, null, 2)}\n\nMenu tersedia (id|nama|kcal|P/C/F per ${safeFoods[0]?.serving_size ?? 100}${safeFoods[0]?.serving_unit ?? "g"}):\n${menuStr}`,
          },
        ],
        tools: [{ type: "function", function: { name: "submit_meal_plan", description: "Submit rekomendasi", parameters: schema } }],
        tool_choice: { type: "function", function: { name: "submit_meal_plan" } },
      }),
    });

    if (res.status === 429) throw new Error("Terlalu banyak permintaan. Coba lagi.");
    if (res.status === 402) throw new Error("Kredit AI habis.");
    if (!res.ok) throw new Error(`AI error: ${res.status}`);
    const json = await res.json();
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("AI tidak mengembalikan rekomendasi");
    const parsed = JSON.parse(args) as { meals: Array<{ meal_type: string; food_item_id?: string | null; name: string; planned_qty: number; calories: number; protein_g?: number; carbs_g?: number; fat_g?: number; reason: string }>; summary: string };

    return {
      summary: parsed.summary,
      remaining_budget_kcal: Math.round(remaining),
      meals: parsed.meals,
    };
  });

export const acceptMealPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      plan_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      items: z.array(z.object({
        meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
        food_item_id: z.string().uuid().nullable().optional(),
        custom_name: z.string().max(100).nullable().optional(),
        calories: z.number().min(0).max(5000),
        planned_qty: z.number().min(0.1).max(20).default(1),
      })).min(1).max(10),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const rows = data.items.map((it) => ({
      user_id: userId,
      plan_date: data.plan_date,
      meal_type: it.meal_type,
      food_item_id: it.food_item_id ?? null,
      custom_name: it.food_item_id ? null : (it.custom_name ?? "Custom"),
      calories: it.calories,
      planned_qty: it.planned_qty,
    }));
    const { error } = await supabase.from("meal_plans").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true, inserted: rows.length };
  });