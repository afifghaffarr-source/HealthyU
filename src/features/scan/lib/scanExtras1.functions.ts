import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiJsonWithSchema, type AiContentPart } from "@/features/ai/lib/aiGateway.server";
import type { ZodTypeAny } from "zod";

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
