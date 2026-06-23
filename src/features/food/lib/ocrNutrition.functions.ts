import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiJsonWithSchema } from "@/features/ai/lib/aiGateway.server";
import { wrapAiSystemPrompt } from "@/features/safety/lib/medicalSafety";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any; // table not yet in generated Supabase types until migration applied

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const NutritionLabelSchema = z.object({
  brand: z.string().default(""),
  product_name: z.string().default(""),
  serving_size: z.string().default(""),
  servings_per_container: z.string().default(""),
  calories: z.coerce.number().default(0),
  total_fat_g: z.coerce.number().default(0),
  saturated_fat_g: z.coerce.number().default(0),
  trans_fat_g: z.coerce.number().default(0),
  cholesterol_mg: z.coerce.number().default(0),
  sodium_mg: z.coerce.number().default(0),
  total_carbs_g: z.coerce.number().default(0),
  dietary_fiber_g: z.coerce.number().default(0),
  total_sugars_g: z.coerce.number().default(0),
  added_sugars_g: z.coerce.number().default(0),
  protein_g: z.coerce.number().default(0),
  vitamin_a_pct: z.coerce.number().default(0),
  vitamin_c_pct: z.coerce.number().default(0),
  calcium_pct: z.coerce.number().default(0),
  iron_pct: z.coerce.number().default(0),
  confidence: z.coerce.number().default(0),
  language: z.string().default("id"),
  raw_text_summary: z.string().default(""),
  warnings: z.array(z.string()).default([]),
});

// ─── System prompt ───────────────────────────────────────────────────────────

const OCR_SYSTEM = `Anda adalah AI OCR Nutrition Label Reader. Tugasmu:

1. BACA semua teks dari gambar label informasi nilai gizi (nutrition facts label).
2. EKSTRAK semua data nutrisi secara akurat: kalori, lemak, karbohidrat, protein, vitamin, mineral.
3. KEMBALIKAN JSON terstruktur sesuai schema yang diminta.

Aturan penting:
- Jika gambar BUKAN label nutrisi, kembalikan confidence: 0 dan semua nilai 0.
- Satuan: kalori dalam kkal, lemak/karbo/protein dalam gram (g), sodium/kolesterol dalam miligram (mg).
- Persentase vitamin/mineral (% DV) dikonversi ke angka 0-100.
- Jika ada "per serving" dan "per container", ambil nilai PER SERVING.
- Baca juga brand name dan nama produk jika terlihat.
- Jika label dalam bahasa Inggris, set language: "en". Bahasa Indonesia: "id".
- Berikan warnings jika menemukan: trans fat > 0, sodium > 20% DV, added sugars > 10% DV.
- Confidence: 0.9-1.0 jika label jelas, 0.5-0.8 jika buram/sebagian, 0-0.3 jika bukan label nutrisi.

Balas HANYA JSON valid tanpa markdown fence.`;

// ─── Server functions ────────────────────────────────────────────────────────

export const scanNutritionLabel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        image_data_url: z.string().startsWith("data:image/").max(8_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const startedAt = Date.now();
    const { supabase, userId } = context;
    const model = "google/gemini-2.5-flash";

    // Call AI with vision
    const label = await callAiJsonWithSchema({
      userId,
      feature: "ocr.nutrition_label",
      model,
      schema: NutritionLabelSchema,
      fallback: {
        brand: "",
        product_name: "",
        serving_size: "",
        servings_per_container: "",
        calories: 0,
        total_fat_g: 0,
        saturated_fat_g: 0,
        trans_fat_g: 0,
        cholesterol_mg: 0,
        sodium_mg: 0,
        total_carbs_g: 0,
        dietary_fiber_g: 0,
        total_sugars_g: 0,
        added_sugars_g: 0,
        protein_g: 0,
        vitamin_a_pct: 0,
        vitamin_c_pct: 0,
        calcium_pct: 0,
        iron_pct: 0,
        confidence: 0,
        language: "id",
        raw_text_summary: "",
        warnings: [],
      },
      messages: [
        { role: "system", content: wrapAiSystemPrompt(OCR_SYSTEM) },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Baca label nutrisi di foto ini dan kembalikan data terstruktur.",
            },
            { type: "image_url", image_url: { url: data.image_data_url } },
          ],
        },
      ],
    });

    // If confidence is 0, the image wasn't a nutrition label
    if (label.confidence < 0.3) {
      return {
        ok: false,
        reason: "not_nutrition_label",
        message: "Gambar tidak terdeteksi sebagai label informasi nilai gizi.",
      };
    }

    // Upload image to storage
    let storagePath: string | null = null;
    try {
      const base64 = data.image_data_url.split(",")[1] ?? "";
      const buffer = Buffer.from(base64, "base64");
      const fileName = `${userId}/${Date.now()}_ocr.jpg`;
      const { data: uploadData } = await supabase.storage
        .from("ocr-labels")
        .upload(fileName, buffer, { contentType: "image/jpeg", upsert: false });
      storagePath = uploadData?.path ?? null;
    } catch {
      // Non-blocking — proceed without storing image
    }

    // Save to DB
    // Cast to any — table not yet in generated types until migration applied
    const { data: row, error } = await (supabase as AnyClient)
      .from("ocr_nutrition_labels")
      .insert({
        user_id: userId,
        storage_path: storagePath,
        raw_ocr_text: label.raw_text_summary,
        brand: label.brand || null,
        product_name: label.product_name || null,
        serving_size: label.serving_size || null,
        servings_per_container: label.servings_per_container || null,
        calories: label.calories || null,
        total_fat_g: label.total_fat_g || null,
        saturated_fat_g: label.saturated_fat_g || null,
        trans_fat_g: label.trans_fat_g || null,
        cholesterol_mg: label.cholesterol_mg || null,
        sodium_mg: label.sodium_mg || null,
        total_carbs_g: label.total_carbs_g || null,
        dietary_fiber_g: label.dietary_fiber_g || null,
        total_sugars_g: label.total_sugars_g || null,
        added_sugars_g: label.added_sugars_g || null,
        protein_g: label.protein_g || null,
        vitamin_a_pct: label.vitamin_a_pct || null,
        vitamin_c_pct: label.vitamin_c_pct || null,
        calcium_pct: label.calcium_pct || null,
        iron_pct: label.iron_pct || null,
        language: label.language,
        confidence: label.confidence,
        processing_time_ms: Date.now() - startedAt,
        model_version: model.split("/")[1] ?? model,
      })
      .select("id")
      .maybeSingle();

    return {
      ok: true,
      label_id: row?.id ?? null,
      label,
      storage_path: storagePath,
    };
  });

export const getOcrHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await (supabase as AnyClient)
      .from("ocr_nutrition_labels")
      .select(
        "id, brand, product_name, serving_size, calories, protein_g, total_fat_g, total_carbs_g, confidence, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);
    return data ?? [];
  });

/**
 * Add an OCR-scanned nutrition label as a meal log entry.
 * Creates a food_item if it doesn't exist, then logs it.
 */
export const addOcrAsMealLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        label_id: z.string().uuid(),
        meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
        meal_date: z.string().optional(),
        multiplier: z.number().min(0.5).max(10).default(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Get the OCR label
    const { data: label } = await (supabase as AnyClient)
      .from("ocr_nutrition_labels")
      .select("*")
      .eq("id", data.label_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!label) {
      return { ok: false, reason: "label_not_found" };
    }

    const mult = data.multiplier;
    const productName = (label.product_name || label.brand || "Produk OCR").trim();
    const mealDate = data.meal_date ?? new Date().toISOString().split("T")[0];

    // Try to match existing food item
    const { data: existingFood } = await supabase
      .from("food_items")
      .select("id")
      .or(`name.ilike.%${productName}%,name_en.ilike.%${productName}%`)
      .limit(1)
      .maybeSingle();

    let foodItemId = existingFood?.id;

    // If no match, create a new food item from OCR data
    if (!foodItemId) {
      const aliases = [
        productName.toLowerCase(),
        ...(label.brand ? [label.brand.toLowerCase()] : []),
      ].filter(Boolean);

      const { data: newItem } = await supabase
        .from("food_items")
        .insert({
          name: productName,
          calories: label.calories ? Math.round(Number(label.calories) * mult) : null,
          protein_g: label.protein_g ? Math.round(Number(label.protein_g) * mult * 10) / 10 : null,
          carbs_g: label.total_carbs_g
            ? Math.round(Number(label.total_carbs_g) * mult * 10) / 10
            : null,
          fat_g: label.total_fat_g ? Math.round(Number(label.total_fat_g) * mult * 10) / 10 : null,
          sugar_g: label.total_sugars_g
            ? Math.round(Number(label.total_sugars_g) * mult * 10) / 10
            : null,
          sodium_mg: label.sodium_mg ? Math.round(Number(label.sodium_mg) * mult) : null,
          fiber_g: label.dietary_fiber_g
            ? Math.round(Number(label.dietary_fiber_g) * mult * 10) / 10
            : null,
          aliases: JSON.parse(JSON.stringify(aliases)),
          portion_label: label.serving_size ?? "1 serving",
          source: "ocr",
          confidence_score: label.confidence ?? 0.7,
        } as never)
        .select("id")
        .maybeSingle();
      foodItemId = newItem?.id;
    }

    // Create meal log entry
    const { error } = await supabase.from("meal_logs").insert({
      user_id: userId,
      food_item_id: foodItemId,
      meal_type: data.meal_type,
      meal_date: mealDate,
      quantity: mult,
      source: "ocr",
      notes: label.brand ? `OCR: ${label.brand} ${label.serving_size ?? ""}` : "OCR scan",
    } as never);

    if (error) throw new Error(error.message);

    return { ok: true, food_item_id: foodItemId };
  });
