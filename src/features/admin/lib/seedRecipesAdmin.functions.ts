/**
 * Admin server function: bulk-seed Indonesian recipes via VexoAPI.
 * Mirrors scripts/seed_recipes.py but runs in the CF Worker environment.
 *
 * Admin-only: requires user_roles.role = 'admin' (checked via has_role RPC).
 * Idempotent: skips recipes whose slug already exists in `recipes`.
 *
 * Used by /admin/seed-recipes UI for ops/admin tasks.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { parseInput } from "@/lib/validation";
import { callAiJsonWithSchema } from "@/features/ai/lib/aiGateway.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SeedInputSchema = z.object({
  count: z.number().int().min(1).max(20),
  category: z.string().max(50).optional(),
  focus: z.string().max(200).optional(),
  dryRun: z.boolean().default(false),
  imageTemplate: z.string().default("/images/recipes/{slug}.png"),
});

const RecipeSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  cuisine: z.string().optional(),
  prep_min: z.coerce.number().optional(),
  cook_min: z.coerce.number().optional(),
  servings: z.coerce.number().optional(),
  calories: z.coerce.number().optional(),
  protein_g: z.coerce.number().optional(),
  carbs_g: z.coerce.number().optional(),
  fat_g: z.coerce.number().optional(),
  fiber_g: z.coerce.number().optional(),
  ingredients: z.array(z.string()).optional(),
  instructions: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  is_vegetarian: z.boolean().optional(),
  is_vegan: z.boolean().optional(),
  is_halal: z.boolean().optional(),
  is_keto_friendly: z.boolean().optional(),
  difficulty: z.string().optional(),
});
const RecipesArraySchema = z.array(RecipeSchema);

type SeedInput = z.infer<typeof SeedInputSchema>;
type SeedResult = {
  inserted: Array<{ slug: string; title: string; recipesId: string; seoId: string }>;
  skipped: Array<{ title: string; reason: string }>;
  failed: Array<{ title: string; error: string }>;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function ensureAdmin(supabase: typeof supabaseAdmin, userId: string) {
  // Supabase types overload RPC; cast to unknown-friendly signature for our call.
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  } as never);
  if (!isAdmin) throw new Error("Forbidden: admin role required");
}

async function slugTaken(slug: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from("recipes").select("id").eq("slug", slug).maybeSingle();
  return !!data;
}

async function findFreeSlug(baseSlug: string): Promise<string | null> {
  if (!(await slugTaken(baseSlug))) return baseSlug;
  for (let i = 2; i < 10; i++) {
    const candidate = `${baseSlug}-${i}`;
    if (!(await slugTaken(candidate))) return candidate;
  }
  return null;
}

async function insertRecipe(raw: z.infer<typeof RecipeSchema>, imageTemplate: string) {
  const title = raw.title.trim();
  if (!title) throw new Error("missing title");

  const baseSlug = slugify(title);
  if (!baseSlug) throw new Error("title slugifies to empty");

  const slug = await findFreeSlug(baseSlug);
  if (!slug) throw new Error(`all slug variants for '${baseSlug}' taken`);

  const imageUrl =
    imageTemplate && imageTemplate.includes("{slug}")
      ? imageTemplate.replace(/\{slug\}/g, slug)
      : null;

  const now = new Date().toISOString();
  const prepMin = raw.prep_min ?? 0;
  const cookMin = raw.cook_min ?? 0;
  const totalMin = prepMin + cookMin;

  const recipesPayload = {
    title,
    slug,
    description: raw.description ?? undefined,
    category: raw.category ?? undefined,
    cuisine: raw.cuisine ?? "Indonesia",
    image_url: imageUrl,
    prep_min: raw.prep_min ?? undefined,
    cook_min: raw.cook_min ?? undefined,
    total_min: totalMin || undefined,
    servings: raw.servings ?? undefined,
    calories: raw.calories ?? undefined,
    protein_g: raw.protein_g ?? undefined,
    carbs_g: raw.carbs_g ?? undefined,
    fat_g: raw.fat_g ?? undefined,
    fiber_g: raw.fiber_g ?? undefined,
    ingredients: raw.ingredients ?? [],
    instructions: raw.instructions ?? [],
    tags: raw.tags ?? [],
    is_vegan: raw.is_vegan ?? false,
    is_vegetarian: raw.is_vegetarian ?? false,
    is_halal: raw.is_halal ?? true,
    is_keto_friendly: raw.is_keto_friendly ?? false,
    is_indonesian: true,
    difficulty: raw.difficulty ?? "beginner",
    is_published: true,
    is_featured: false,
    body_source: "seed",
  };

  const { data: rec, error: recErr } = await supabaseAdmin
    .from("recipes")
    .insert(recipesPayload)
    .select("id")
    .single();
  if (recErr || !rec) throw new Error(`recipes INSERT failed: ${recErr?.message}`);

  const seoPayload = {
    slug,
    title,
    description: raw.description ?? undefined,
    category: raw.category ?? undefined,
    cuisine: raw.cuisine ?? "Indonesia",
    image_url: imageUrl,
    prep_min: raw.prep_min ?? undefined,
    cook_min: raw.cook_min ?? undefined,
    total_min: totalMin || undefined,
    servings: raw.servings ?? undefined,
    calories: raw.calories ?? undefined,
    protein_g: raw.protein_g ?? undefined,
    carbs_g: raw.carbs_g ?? undefined,
    fat_g: raw.fat_g ?? undefined,
    fiber_g: raw.fiber_g ?? undefined,
    ingredients: raw.ingredients ?? [],
    instructions: raw.instructions ?? [],
    tags: raw.tags ?? [],
    keywords: raw.keywords ?? [],
    is_vegan: raw.is_vegan ?? false,
    is_vegetarian: raw.is_vegetarian ?? false,
    is_halal: raw.is_halal ?? true,
    published: true,
    published_at: now,
    created_at: now,
    updated_at: now,
  };

  const { data: seo, error: seoErr } = await supabaseAdmin
    .from("seo_recipes")
    .insert(seoPayload)
    .select("id")
    .single();
  if (seoErr || !seo) {
    // Rollback recipes insert
    await supabaseAdmin.from("recipes").delete().eq("id", rec.id);
    throw new Error(`seo_recipes INSERT failed (rolled back recipes): ${seoErr?.message}`);
  }

  return { slug, title, recipesId: rec.id, seoId: seo.id };
}

export const seedRecipesAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => parseInput(SeedInputSchema, i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as {
      supabase: typeof supabaseAdmin;
      userId: string;
    };
    if (!userId) throw new Error("not authenticated");
    await ensureAdmin(supabase, userId);

    const result: SeedResult = { inserted: [], skipped: [], failed: [] };

    const catConstraint = data.category
      ? `Must use category="${data.category}".`
      : "Vary category across: breakfast, snack, main, salad, sayur, lauk, minuman, sup, makan besar, sarapan.";
    const focusConstraint = data.focus
      ? `Nutritional focus: ${data.focus}.`
      : "Balanced nutritional profile.";

    const prompt = `Generate ${data.count} Indonesian healthy recipes as a JSON array.

Each recipe object must have exactly these fields:
  title: string (Indonesian, recipe name)
  description: string (Indonesian, 1-2 sentences about the recipe)
  category: string (${catConstraint.replace("Must use category=", "must be ")})
  cuisine: "Indonesia"
  prep_min: integer (5-60)
  cook_min: integer (0-60)
  servings: integer (1-4)
  calories: integer (80-550)
  protein_g: number (2-45)
  carbs_g: number (5-80)
  fat_g: number (1-25)
  fiber_g: number (0-12)
  ingredients: array of 5-12 strings (Indonesian, e.g., "150g dada ayam")
  instructions: array of 3-8 strings (Indonesian cooking steps)
  tags: array of 2-5 strings (English lowercase)
  is_vegetarian: boolean
  is_vegan: boolean
  is_halal: true (always)
  difficulty: one of "beginner", "intermediate", "advanced"

Constraints:
  - ${focusConstraint}
  - Indonesian cooking techniques (tumis, rebus, goreng, kukus, panggang)
  - Realistic ingredients findable in Indonesian markets
  - Calories realistic for diet app (low-to-medium)
  - Vary the recipes

Output ONLY the JSON array. No markdown, no explanation.`;

    let recipes: z.infer<typeof RecipesArraySchema>;
    try {
      recipes = await callAiJsonWithSchema({
        userId: null, // system job, not user-scoped
        feature: "admin.seed_recipes",
        skipBudget: true,
        model: "google/gemini-2.5-flash",
        maxTokens: 4096,
        schema: RecipesArraySchema,
        messages: [
          {
            role: "system",
            content: "You are a JSON-only API. Output ONLY valid JSON array of recipe objects.",
          },
          { role: "user", content: prompt },
        ],
      });
    } catch (e) {
      throw new Error(`AI call failed: ${(e as Error).message}`);
    }

    if (recipes.length < data.count) {
      // Non-fatal — AI may return fewer. Just log.
    }

    for (const raw of recipes.slice(0, data.count)) {
      const title = (raw.title ?? "").trim();

      if (!title) {
        result.skipped.push({ title: "(blank)", reason: "no title" });
        continue;
      }

      if (data.dryRun) {
        const baseSlug = slugify(title);
        result.inserted.push({
          slug: `${baseSlug} (would-insert)`,
          title,
          recipesId: "dry-run",
          seoId: "dry-run",
        });
        continue;
      }

      try {
        const inserted = await insertRecipe(raw, data.imageTemplate);
        result.inserted.push(inserted);
      } catch (e) {
        const errMsg = (e as Error).message;
        if (errMsg.includes("slug variants") || errMsg.includes("slugifies to empty")) {
          result.skipped.push({ title, reason: errMsg });
        } else {
          result.failed.push({ title, error: errMsg });
        }
      }
    }

    return result;
  });
