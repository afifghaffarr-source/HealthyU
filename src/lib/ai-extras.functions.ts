import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiJsonWithGuards } from "@/lib/aiGateway.server";

const callGemini = (
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  userId: string | null,
  feature: string,
) =>
  callAiJsonWithGuards({
    userId,
    feature,
    messages,
    model: "google/gemini-3-flash-preview",
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

    const parsed = await callGemini([
      { role: "system", content: sys },
      { role: "user", content: user },
    ], userId, "recipe.generate");
    const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
    const num = (v: unknown, d = 0): number => {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };
    return {
      title: String(parsed.title ?? "Resep"),
      description: String(parsed.description ?? ""),
      ingredients: arr(parsed.ingredients),
      instructions: arr(parsed.instructions),
      prep_min: num(parsed.prep_min, 20),
      servings: num(parsed.servings, 1),
      calories: num(parsed.calories),
      protein_g: num(parsed.protein_g),
      carbs_g: num(parsed.carbs_g),
      fat_g: num(parsed.fat_g),
      tips: arr(parsed.tips),
    };
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
    const parsed = await callGemini([
      { role: "system", content: sys },
      { role: "user", content: user },
    ], userId, "voice.meal_parse");
    const num = (v: unknown, d = 0): number => {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };
    const mt = String(parsed.meal_type ?? "snack");
    const meal_type = (
      ["breakfast", "lunch", "dinner", "snack"].includes(mt) ? mt : "snack"
    ) as ParsedMeal["meal_type"];
    return {
      custom_name: String(parsed.custom_name ?? data.transcript.slice(0, 60)),
      meal_type,
      serving_qty: num(parsed.serving_qty, 1),
      calories: num(parsed.calories),
      protein_g: num(parsed.protein_g),
      carbs_g: num(parsed.carbs_g),
      fat_g: num(parsed.fat_g),
    };
  });
