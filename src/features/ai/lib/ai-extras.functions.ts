import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiJsonWithSchema } from "@/features/ai/lib/aiGateway.server";

const RecipeSchema = z.object({
  title: z.string().default("Resep"),
  description: z.string().default(""),
  ingredients: z.array(z.string()).default([]),
  instructions: z.array(z.string()).default([]),
  prep_min: z.coerce.number().default(20),
  servings: z.coerce.number().default(1),
  calories: z.coerce.number().default(0),
  protein_g: z.coerce.number().default(0),
  carbs_g: z.coerce.number().default(0),
  fat_g: z.coerce.number().default(0),
  tips: z.array(z.string()).default([]),
});
const ParsedMealSchema = z.object({
  custom_name: z.string().default(""),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]).default("snack"),
  serving_qty: z.coerce.number().default(1),
  calories: z.coerce.number().default(0),
  protein_g: z.coerce.number().default(0),
  carbs_g: z.coerce.number().default(0),
  fat_g: z.coerce.number().default(0),
});
export type GeneratedRecipe = {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prep_min: number;
  servings: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  tips: string[];
};

export const generateRecipeFromIngredients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        ingredients: z.string().min(2).max(500),
        preferences: z.string().max(200).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<GeneratedRecipe> => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("health_conditions, allergies, dietary_preference, daily_calorie_target")
      .eq("id", userId)
      .maybeSingle();

    const sys =
      "Kamu adalah chef sehat berbahasa Indonesia. Buat resep masakan praktis dari bahan yang tersedia, mempertimbangkan kondisi kesehatan & alergi pengguna. Hanya jawab JSON valid sesuai schema.";
    const user = `Bahan tersedia: ${data.ingredients}
Preferensi tambahan: ${data.preferences ?? "-"}
Kondisi kesehatan: ${(profile?.health_conditions ?? []).join(", ") || "-"}
Alergi: ${(profile?.allergies ?? []).join(", ") || "-"}
Pola diet: ${profile?.dietary_preference ?? "-"}
Target kalori harian: ${profile?.daily_calorie_target ?? "-"}

Balas JSON:
{
  "title": "Nama resep",
  "description": "1-2 kalimat",
  "ingredients": ["bahan + takaran"],
  "instructions": ["langkah 1", "langkah 2", ...],
  "prep_min": number,
  "servings": number,
  "calories": number (per porsi),
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "tips": ["1-3 tips sehat"]
}`;

    const parsed = await callAiJsonWithSchema({
      userId,
      feature: "recipe.generate",
      model: "google/gemini-3-flash-preview",
      schema: RecipeSchema,
      fallback: RecipeSchema.parse({}),
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    });
    return parsed as GeneratedRecipe;
  });

export type ParsedMeal = {
  custom_name: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  serving_qty: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export const parseMealFromVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ transcript: z.string().min(2).max(500) }).parse(i))
  .handler(async ({ data, context }): Promise<ParsedMeal> => {
    const { userId } = context;
    const sys =
      "Kamu ekstrak makanan dari ucapan bahasa Indonesia. Estimasi gizi rata-rata (per porsi disebut). Jawab JSON valid saja.";
    const user = `Transkrip: "${data.transcript}"
Waktu saat ini: ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}

Balas JSON:
{
  "custom_name": "nama makanan singkat",
  "meal_type": "breakfast|lunch|dinner|snack",
  "serving_qty": number (default 1),
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number
}`;
    const parsed = await callAiJsonWithSchema({
      userId,
      feature: "voice.meal_parse",
      model: "google/gemini-3-flash-preview",
      schema: ParsedMealSchema,
      fallback: ParsedMealSchema.parse({}),
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    });
    return {
      custom_name: parsed.custom_name || data.transcript.slice(0, 60),
      meal_type: parsed.meal_type,
      serving_qty: parsed.serving_qty || 1,
      calories: parsed.calories,
      protein_g: parsed.protein_g,
      carbs_g: parsed.carbs_g,
      fat_g: parsed.fat_g,
    };
  });
