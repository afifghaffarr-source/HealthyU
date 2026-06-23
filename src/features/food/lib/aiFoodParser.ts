import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiJsonWithSchema } from "@/features/ai/lib/aiGateway.server";

// ─── AI System Prompt for NL Food Parsing ───────────────────────────────────

const NL_FOOD_PARSER_SYSTEM = `Kamu adalah AI Natural Language Food Parser untuk makanan & minuman Indonesia.
Tugasmu: parse teks natural language dari user menjadi daftar item makanan dengan estimasi nutrisi.

Contoh input yang harus bisa kamu parse:
- "nasi padang ayam bakar setengah porsi"
- "mie ayam bakso 1 mangkok"
- "nasi goreng telur ceplok 2 porsi"
- "es teh manis 2 gelas"
- "tempe goreng 3 potong sama tahu 2"
- "roti 2 sama susu 1 gelas"
- "makan siang tadi nasi uduk ayam goreng kerupuk sambal"

Aturan:
1. Identifikasi SEMUA makanan/minuman yang disebut user.
2. Estimasi porsi berdasarkan kata kunci (setengah, 1, 2, 3, seporsi, semangkok, segelas, dll).
3. Gunakan nama makanan Indonesia yang umum.
4. Estimasi kalori realistis berdasarkan porsi.
5. Jika ada kata yang tidak bisa diidentifikasi sebagai makanan, abaikan.
6. Jika teks kosong atau tidak ada makanan, kembalikan items: [].

Balas HANYA JSON valid, tanpa markdown fence, dengan bentuk:
{
  "items": [
    {
      "name": "Nama makanan (Bahasa Indonesia)",
      "portion_qty": 1,
      "portion_unit": "piring",
      "portion_g": 250,
      "calories": 420,
      "protein_g": 12,
      "carbs_g": 55,
      "fat_g": 14,
      "sugar_g": 5,
      "sodium_mg": 800,
      "confidence": 0.9,
      "notes": "catatan opsional (mis: 'setengah porsi dari normal')"
    }
  ]
}

Panduan portion_unit:
- Nasi/makanan piring: "piring"
- Mie/sop/bakso: "mangkok"
- Minuman: "gelas"
- Gorengan/tempe/tahu: "potong"
- Sate: "tusuk"
- Kerupuk/emping: "keping"
- Telur: "butir"
- Buah: "buah"
- Jika tidak yakin: "porsi"

Estimasi portion_g per unit:
- 1 piring nasi = ~250g
- 1 mangkok mie/sop = ~300g
- 1 gelas minuman = ~250ml (=250g)
- 1 potong gorengan = ~50g
- 1 potong tempe/tahu = ~40g
- 1 tusuk sate = ~35g
- 1 keping kerupuk = ~10g
- 1 butir telur = ~55g
- 1 buah pisang = ~100g
- 1 sendok makan = ~15g`;

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const ParsedFoodItemSchema = z.object({
  name: z.string().min(1, "Nama makanan wajib diisi").max(100),
  portion_qty: z.coerce.number().min(0.1).max(20).default(1),
  portion_unit: z.string().max(30).default("porsi"),
  portion_g: z.coerce.number().min(1).max(5000).default(100),
  calories: z.coerce.number().min(0).max(5000).default(0),
  protein_g: z.coerce.number().min(0).max(500).default(0),
  carbs_g: z.coerce.number().min(0).max(500).default(0),
  fat_g: z.coerce.number().min(0).max(500).default(0),
  sugar_g: z.coerce.number().min(0).max(500).default(0),
  sodium_mg: z.coerce.number().min(0).max(10000).default(0),
  confidence: z.coerce.number().min(0).max(1).default(0.5),
  notes: z.string().max(200).optional(),
});

const NlParseResultSchema = z.object({
  items: z.array(ParsedFoodItemSchema).default([]),
});

export type NlParsedFoodItem = z.infer<typeof ParsedFoodItemSchema> & {
  matched_food_id?: string | null;
  matched_food_name?: string | null;
};

// ─── Server Functions ───────────────────────────────────────────────────────

/**
 * Parse natural language food input using AI.
 *
 * Flow:
 * 1. User ketik: "nasi padang ayam bakar setengah porsi"
 * 2. AI parse → structured food items
 * 3. Try match each item against existing food_items DB (by name + aliases)
 * 4. Return results for user confirmation before saving
 */
export const parseNaturalLanguageFood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ text: z.string().min(1).max(500) }).parse(input))
  .handler(async ({ data, context }): Promise<{ items: NlParsedFoodItem[] }> => {
    const { supabase, userId } = context;
    const trimmed = data.text.trim();

    // Quick heuristic: if the text matches an existing food alias exactly,
    // skip AI and return the DB record directly (faster + cheaper)
    const directMatch = await tryDirectMatch(supabase, trimmed);
    if (directMatch) {
      return { items: [directMatch] };
    }

    // Parse with AI
    const parsed = await callAiJsonWithSchema({
      userId,
      feature: "food.nl_parse",
      model: "google/gemini-2.5-flash",
      isPremium: false,
      schema: NlParseResultSchema,
      fallback: { items: [] },
      messages: [
        { role: "system", content: NL_FOOD_PARSER_SYSTEM },
        { role: "user", content: trimmed },
      ],
    });

    // Try matching each parsed item against food_items DB
    const enriched: NlParsedFoodItem[] = await Promise.all(
      parsed.items.slice(0, 10).map(async (it) => {
        const match = await tryDirectMatch(supabase, it.name);
        return {
          ...it,
          matched_food_id: match?.matched_food_id ?? null,
          matched_food_name: match?.matched_food_name ?? null,
        };
      }),
    );

    return { items: enriched };
  });

/**
 * Try to find an exact or alias match for a food name in the database.
 * Returns null if no match found.
 */
async function tryDirectMatch(
  supabase: SupabaseClient,
  foodName: string,
): Promise<NlParsedFoodItem | null> {
  const term = foodName.trim().toLowerCase().slice(0, 80);
  if (!term) return null;

  // Search by name ILIKE or aliases overlap
  const { data: food } = await supabase
    .from("food_items")
    .select(
      "id,name,name_en,calories,protein_g,carbs_g,fat_g,fiber_g,sugar_g,sodium_mg,serving_size,serving_unit,aliases,portion_label,source,confidence_score",
    )
    .or(`name.ilike.%${term}%,aliases.cs.{${term}}`)
    .order("confidence_score", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!food) return null;

  const servingG = Number(food.serving_size ?? 100);

  return {
    name: food.name,
    portion_qty: 1,
    portion_unit: food.serving_unit ?? "g",
    portion_g: servingG,
    calories: Number(food.calories ?? 0),
    protein_g: Number(food.protein_g ?? 0),
    carbs_g: Number(food.carbs_g ?? 0),
    fat_g: Number(food.fat_g ?? 0),
    sugar_g: Number(food.sugar_g ?? 0),
    sodium_mg: Number(food.sodium_mg ?? 0),
    confidence: Number(food.confidence_score ?? 0.5),
    matched_food_id: food.id,
    matched_food_name: food.name,
    notes: food.source ? `Sumber: ${food.source}` : undefined,
  };
}
