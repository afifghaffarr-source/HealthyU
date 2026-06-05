import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { callAiJsonWithSchema } from "@/lib/aiGateway.server";

export const getFoodAlternatives = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ food_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("food_alternatives")
      .select("id, similarity_score, reason, alternative_food_id")
      .eq("food_id", data.food_id)
      .order("similarity_score", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r) => r.alternative_food_id);
    if (ids.length === 0) return [];
    const { data: foods } = await supabase
      .from("food_items")
      .select(
        "id, name, calories, protein_g, carbs_g, fat_g, sugar_g, sodium_mg, fiber_g, health_rating, serving_size, serving_unit",
      )
      .in("id", ids);
    const fmap = new Map((foods ?? []).map((f) => [f.id, f]));
    return (rows ?? [])
      .map((r) => {
        const f = fmap.get(r.alternative_food_id);
        if (!f) return null;
        return {
          ...f,
          similarity_score: r.similarity_score,
          reason: r.reason,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  });

const ReasonsSchema = z.object({
  reasons: z
    .array(z.object({ id: z.string().optional(), reason: z.string().optional() }))
    .default([]),
});
const callGeminiJSON = (
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  userId: string | null,
) =>
  callAiJsonWithSchema({
    userId,
    feature: "food.alternatives.reasons",
    messages,
    model: "google/gemini-3-flash-preview",
    schema: ReasonsSchema,
    fallback: { reasons: [] },
  });

export const regenerateAlternativeReasons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({ food_id: z.string().uuid(), health_context: z.string().max(200).optional() })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Auto-fill health_context from user profile when not provided
    let healthContext = data.health_context;
    if (!healthContext) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("health_conditions")
        .eq("id", userId)
        .maybeSingle();
      const conds = (prof?.health_conditions as string[] | null) ?? [];
      if (conds.length > 0) healthContext = conds.slice(0, 5).join(", ");
    }

    const { data: source } = await supabase
      .from("food_items")
      .select(
        "name, calories, sodium_mg, sugar_g, fiber_g, glycemic_index, fat_g, carbs_g, protein_g",
      )
      .eq("id", data.food_id)
      .maybeSingle();
    if (!source) throw new Error("Makanan tidak ditemukan");

    const { data: alts } = await supabase
      .from("food_alternatives")
      .select("id, alternative_food_id")
      .eq("food_id", data.food_id)
      .limit(10);
    if (!alts || alts.length === 0) throw new Error("Belum ada alternatif untuk diregenerasi");

    const ids = alts.map((a) => a.alternative_food_id);
    const { data: foods } = await supabase
      .from("food_items")
      .select("id, name, calories, sodium_mg, sugar_g, fiber_g, glycemic_index")
      .in("id", ids);
    const fmap = new Map((foods ?? []).map((f) => [f.id, f]));

    const items = alts
      .map((a) => {
        const f = fmap.get(a.alternative_food_id);
        return f
          ? {
              alt_id: a.id,
              alt_name: f.name,
              calories: f.calories,
              sodium_mg: f.sodium_mg,
              sugar_g: f.sugar_g,
              fiber_g: f.fiber_g,
              glycemic_index: f.glycemic_index,
            }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const prompt = `Makanan asal: ${source.name} (kal ${source.calories}, natrium ${source.sodium_mg}mg, gula ${source.sugar_g}g, serat ${source.fiber_g}g, GI ${source.glycemic_index ?? "?"}).
${healthContext ? `Konteks kesehatan pengguna: ${healthContext}.` : ""}
Untuk setiap alternatif berikut, beri penjelasan singkat (maks 12 kata, bahasa Indonesia, kontekstual & spesifik) kenapa lebih sehat. Sebutkan kondisi kesehatan relevan bila ada (mis. "lebih cocok untuk diabetes/hipertensi").
Alternatif: ${JSON.stringify(items.map((x) => ({ id: x.alt_id, name: x.alt_name, kal: x.calories, na: x.sodium_mg, gula: x.sugar_g, serat: x.fiber_g, gi: x.glycemic_index })))}
Output JSON: { "reasons": [{ "id": "<alt_id>", "reason": "..." }] }`;

    const parsed = await callGeminiJSON([
      { role: "system", content: "Kamu adalah ahli gizi. Balas hanya JSON valid." },
      { role: "user", content: prompt },
    ], userId);
    const arr = parsed.reasons;

    let updated = 0;
    for (const r of arr) {
      if (!r.id || !r.reason) continue;
      const { error } = await supabaseAdmin
        .from("food_alternatives")
        .update({ reason: r.reason.slice(0, 200) })
        .eq("id", r.id);
      if (!error) updated++;
    }
    return { updated };
  });
