import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiJsonWithSchema, type AiContentPart } from "@/features/ai/lib/aiGateway.server";
import type { ZodTypeAny } from "zod";

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
  const content: AiContentPart[] = [{ type: "text", text: prompt }];
  if (imageUrl) content.push({ type: "image_url", image_url: { url: imageUrl } });
  return await callAiJsonWithSchema({
    userId,
    feature,
    schema,
    fallback,
    messages: [{ role: "user", content }],
  });
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
    const parsed = await callGeminiJson(
      'OCR menu restoran. Balas JSON {"items":[{"name":"...","price":12345,"description":"...","est_calories":420}]}',
      data.image_data_url,
      "scan.menu.image",
      context.userId,
      MenuImageSchema,
      { items: [] },
    );
    return { items: parsed.items };
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
  .inputValidator((d) => z.object({ imageBase64: z.string().min(10) }).parse(d))
  .handler(async ({ data, context }) => {
    const result = await callAiJsonWithSchema({
      userId: context.userId,
      feature: "recipe.from_fridge",
      schema: FridgeRecipesSchema,
      fallback: { ingredients: [], recipes: [] },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Lihat foto kulkas ini. Identifikasi bahan dan saran 3 resep. JSON {ingredients:[], recipes:[{name, steps:[]}]}.",
            },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${data.imageBase64}` },
            },
          ],
        },
      ],
    });
    return { result };
  });

// ===== from scanBatch12b (ocrNutritionLabel) =====

const NutritionLabelSchema = z.record(z.union([z.string(), z.number()]));

export const ocrNutritionLabel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ imageBase64: z.string().min(50) }).parse(d))
  .handler(async ({ data, context }) => {
    let nutrition: Record<string, string | number> = {};
    try {
      nutrition = await callAiJsonWithSchema({
        userId: context.userId,
        feature: "ocr.nutrition_label",
        schema: NutritionLabelSchema,
        fallback: {},
        messages: [
          {
            role: "system",
            content:
              "OCR label nutrisi. Balas JSON: {servingSize, calories, protein_g, carbs_g, fat_g, sugar_g, sodium_mg}. Tanpa markdown.",
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${data.imageBase64}` },
              },
            ],
          },
        ],
      });
    } catch (e) {
      nutrition = { raw: (e as Error).message };
    }
    return { nutrition };
  });
