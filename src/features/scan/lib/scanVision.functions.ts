import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiJsonWithSchema } from "@/features/ai/lib/aiGateway.server";
import { callAiVisionWithFallback } from "@/features/ai/lib/aiProviders";
import { getCachedImageResult, setCachedImageResult } from "@/features/ai/lib/aiCache.server";
import type { ZodTypeAny } from "zod";
import { safeLogServerError } from "@/lib/logSafe";

// ===== from scanExtras1 (ALL) =====

const ImgIn = z.object({
  image_data_url: z.string().startsWith("data:image/").max(8_000_000),
});

async function callGeminiJson<S extends ZodTypeAny>(
  prompt: string,
  imageUrl: string | null,
  feature: string,
  userId: string | null,
  schema: S,
  fallback: z.infer<S>,
): Promise<z.infer<S>> {
  // Sprint 2d: use the multi-provider registry so image-bearing prompts go
  // to OpenRouter (vision-capable) when OPENROUTER_API_KEY is configured,
  // and transparently fall back to OCR/text-only mode when not.
  //
  // Also wires the image result cache (30-day TTL): identical image bytes
  // → cached JSON response, zero AI tokens, sub-100ms latency.
  if (imageUrl) {
    const cached = await getCachedImageResult(imageUrl);
    if (cached) {
      try {
        return JSON.parse(cached.response) as z.infer<S>;
      } catch {
        // Corrupt cache entry → fall through to fresh call
      }
    }
  }
  const result = await callAiVisionWithFallback({
    userId,
    feature,
    schema,
    fallback,
    prompt,
    imageDataUrl: imageUrl ?? undefined,
  });
  if (imageUrl) {
    // Cache the response keyed on image hash (best-effort, fire-and-forget)
    void setCachedImageResult({
      imageDataUrl: imageUrl,
      response: JSON.stringify(result.object),
      model: result.model,
    });
  }
  return result.object;
}

const RecipeImageSchema = z.object({
  title: z.string().default(""),
  ingredients: z
    .array(
      z.object({
        name: z.string().default(""),
        qty: z.string().optional(),
        unit: z.string().optional(),
      }),
    )
    .default([]),
  steps: z.array(z.string()).default([]),
});

const MenuImageSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().default(""),
        price: z.number().optional(),
        description: z.string().optional(),
        est_calories: z.number().optional(),
        // Sprint W2: AI Warung Mode extensions (nutrition + portion + category)
        est_protein_g: z.number().optional(),
        est_carbs_g: z.number().optional(),
        est_fat_g: z.number().optional(),
        est_portion_g: z.number().optional(), // suggested portion in grams
        category: z
          .enum([
            "nasi",
            "lauk",
            "sayur",
            "minuman",
            "pelengkap",
            "dessert",
            "soup",
            "salad",
            "main",
          ])
          .optional(),
      }),
    )
    .default([]),
});

export const parseRecipeImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ImgIn.parse(input))
  .handler(async ({ data, context }) => {
    const parsed = await callGeminiJson(
      'Ekstrak bahan-bahan resep dari foto. Balas JSON {"title":"...","ingredients":[{"name":"...","qty":"...","unit":"..."}],"steps":["..."]}',
      data.image_data_url,
      "scan.recipe.image",
      context.userId,
      RecipeImageSchema,
      { title: "", ingredients: [], steps: [] },
    );
    return {
      title: parsed.title,
      ingredients: parsed.ingredients,
      steps: parsed.steps,
    };
  });

export const parseMenuImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ImgIn.parse(input))
  .handler(async ({ data, context }) => {
    // Sprint W2: AI Warung Mode — Indonesian-context-aware prompt
    const prompt = `Kamu sedang scan menu warteg/warung/restoran Indonesia. 
Ekstrak semua makanan/minuman yang terlihat. Untuk setiap item:
- Identifikasi nama (gunakan nama Indonesia yang umum, misalnya "Nasi Goreng" bukan "Fried Rice")
- Estimasi kalori, protein (g), karbohidrat (g), lemak (g)
- Estimasi porsi dalam gram (misal: nasi 150g, ayam 80g, sayur 100g)
- Kategori: nasi, lauk (protein), sayur, minuman, pelengkap, dessert, soup, salad, main

Balas JSON: {"items":[{"name":"...","price":12345,"description":"...","est_calories":420,"est_protein_g":20,"est_carbs_g":50,"est_fat_g":12,"est_portion_g":150,"category":"lauk"}]}

Jika ada combo (nasi+lauk+sayur), list sebagai item terpisah.`;

    const parsed = await callGeminiJson(
      prompt,
      data.image_data_url,
      "scan.menu.image",
      context.userId,
      MenuImageSchema,
      { items: [] },
    );

    // Sprint W3: Fuzzy match AI results against food_items database
    const { matchFoodItemsBatch } = await import("./nutrition-matcher");

    if (!context) {
      throw new Error("Context not available");
    }

    let enrichedItems = parsed.items as Array<
      z.infer<typeof MenuImageSchema>["items"][number] & {
        food_item_id?: number;
        canonical_name?: string;
        source?: string;
        confidence_score?: number;
        verified_nutrition?: {
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          fiber_g: number;
          serving_size: number;
          serving_unit: string;
          portion_label?: string | null;
        };
      }
    >;

    try {
      const matchResults = await matchFoodItemsBatch(
        context!.supabase,
        parsed.items.map((item) => ({
          name: item.name,
          ai_estimate: {
            calories: item.est_calories,
            protein_g: item.est_protein_g,
            carbs_g: item.est_carbs_g,
            fat_g: item.est_fat_g,
            portion_g: item.est_portion_g,
          },
        })),
      );

      // Merge matched nutrition with AI results
      enrichedItems = parsed.items.map((item, idx) => {
        const match = matchResults[idx];
        return {
          ...item,
          food_item_id: match.food_item_id,
          canonical_name: match.canonical_name,
          source: match.source,
          confidence_score: match.confidence_score,
          verified_nutrition: match.matched ? match.verified_nutrition : undefined,
        };
      });
    } catch (error) {
      // Log fuzzy match error but don't fail the entire scan
      safeLogServerError("scan-menu.fuzzy-match", error).catch(() => {});
      // enrichedItems already set to parsed.items above
    }

    // Sprint W3: Combo detection (nasi + lauk + ≥3 items)
    const hasNasi = enrichedItems.some((i) => i.category === "nasi");
    const hasLauk = enrichedItems.some((i) => i.category === "lauk");
    const isCombo = enrichedItems.length >= 3 && hasNasi && hasLauk;

    if (isCombo) {
      const comboId = crypto.randomUUID();
      const totalCalories = enrichedItems.reduce((sum, i) => {
        if (i.verified_nutrition) {
          return sum + i.verified_nutrition.calories;
        }
        return sum + (i.est_calories || 0);
      }, 0);

      // Detect combo type from dish patterns
      const hasPadangDish = enrichedItems.some(
        (i) =>
          i.canonical_name?.toLowerCase().includes("rendang") ||
          i.canonical_name?.toLowerCase().includes("gulai") ||
          i.name.toLowerCase().includes("rendang") ||
          i.name.toLowerCase().includes("gulai"),
      );

      const comboName = hasPadangDish ? "Paket Padang" : "Paket Warteg";

      return {
        items: enrichedItems,
        combo: {
          id: comboId,
          name: comboName,
          totalCalories,
        },
      };
    }

    return { items: enrichedItems };
  });

// ===== from scanBatch11 (recipeFromFridge) =====

const FridgeRecipesSchema = z.object({
  ingredients: z.array(z.string()).default([]),
  recipes: z
    .array(
      z.object({
        name: z.string().default(""),
        steps: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});

export const recipeFromFridge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ imageBase64: z.string().min(10).max(8_000_000) }).parse(d))
  .handler(async ({ data, context }) => {
    // Sprint 2d: route through multi-provider vision registry + image cache.
    const imageDataUrl = `data:image/jpeg;base64,${data.imageBase64}`;
    const cached = await getCachedImageResult(imageDataUrl);
    if (cached) {
      try {
        return { result: JSON.parse(cached.response) };
      } catch {
        // fall through
      }
    }
    const result = await callAiVisionWithFallback({
      userId: context.userId,
      feature: "recipe.from_fridge",
      schema: FridgeRecipesSchema,
      fallback: { ingredients: [], recipes: [] },
      system:
        "Kamu adalah chef Indonesia. Lihat foto kulkas, identifikasi bahan, dan sarankan 3 resep sederhana Indonesia.",
      prompt:
        "Lihat foto kulkas ini. Identifikasi bahan dan saran 3 resep Indonesia. Balas JSON {ingredients: string[], recipes: [{name, steps: string[]}]}.",
      imageDataUrl,
    });
    void setCachedImageResult({
      imageDataUrl,
      response: JSON.stringify(result.object),
      model: result.model,
    });
    return { result: result.object };
  });

// ===== from scanBatch12b (ocrNutritionLabel) =====
//
// Sprint 2b fix (2026-06-19): VexoAPI has zero vision-capable models (verified
// via /api/v1/models catalog — only text models like gpt-oss-120b, llama, etc.).
// Image inputs to text-only models throw 400 "doesn't support images".
//
// Fix: client runs Tesseract OCR first (already happens for offline support),
// then sends the OCR text + confidence to the server. Server feeds the text
// to AI as a parsing task. AI never needs to "see" the image — it just
// structures the already-extracted text.
//
// Trade-offs:
//   - Privacy: image never leaves device (already the case; Tesseract is client-side)
//   - Cost: ~500 tokens of text vs 1000+ for image tokens
//   - Latency: faster (no image upload)
//   - Reliability: works with 100% of available models

const NutritionLabelSchema = z.record(z.union([z.string(), z.number()]));

const OcrNutritionInput = z.object({
  /** Raw OCR text from Tesseract.js (or any source). */
  ocrText: z.string().min(10).max(50_000),
  /** Tesseract confidence 0-100. Optional — affects prompt hints. */
  ocrConfidence: z.number().min(0).max(100).optional(),
});

export const ocrNutritionLabel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => OcrNutritionInput.parse(d))
  .handler(async ({ data, context }) => {
    let nutrition: Record<string, string | number> = {};
    try {
      const confidenceHint =
        data.ocrConfidence !== undefined && data.ocrConfidence < 50
          ? `\n\nCatatan: confidence OCR rendah (${data.ocrConfidence.toFixed(0)}%). Teks mungkin mengandung error karakter. Tolong lebih toleran terhadap kemungkinan salah baca (mis. 'O' vs '0', 'l' vs '1').`
          : "";

      nutrition = await callAiJsonWithSchema({
        userId: context.userId,
        feature: "ocr.nutrition_label",
        schema: NutritionLabelSchema,
        fallback: {},
        messages: [
          {
            role: "system",
            content:
              `Kamu adalah parser label nutrisi. Teks di bawah ini hasil OCR (bisa saja ada error karakter). Ekstrak nilai nutrisi dan balas HANYA dengan JSON valid (tanpa markdown): {"servingSize": string|null, "calories": number|null, "protein_g": number|null, "carbs_g": number|null, "fat_g": number|null, "sugar_g": number|null, "sodium_mg": number|null}. Jika field tidak terbaca, isi null.` +
              confidenceHint,
          },
          {
            role: "user",
            content: data.ocrText,
          },
        ],
      });
    } catch (e) {
      nutrition = { raw: (e as Error).message };
    }
    return { nutrition };
  });
