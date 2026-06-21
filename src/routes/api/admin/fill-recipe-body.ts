import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireCronSecret } from "@/lib/cronAuth.server";
import { callVexoApi, VexoApiCallError } from "@/features/ai/lib/vexoAdapter.server";
import {
  buildPrompt,
  SYSTEM_PROMPT,
  parseAndNormalizeBody,
  looksHealthy,
  type RecipeInput,
} from "@/features/recipes/lib/recipeBodyFill.lib";

/**
 * Admin: fill empty recipe bodies (ingredients + instructions) via Vexo.
 *
 * Sprint 5d-B: addresses the content gap where 14 published recipes have
 * empty `ingredients` and `instructions` columns (`body_source: "seed"`).
 *
 * Auth: CRON_SECRET via `x-cron-secret` header or `Authorization: Bearer`.
 * Same pattern as /api/public/hooks/* — shared secret, fail-closed if unset.
 *
 * Usage:
 *   POST /api/admin/fill-recipe-body
 *   Headers: x-cron-secret: <CRON_SECRET>
 *   Body:    { "slugs": ["nasi-merah-ayam-bakar", ...] }
 *            OR
 *            { "fillAllEmpty": true }   // fill every recipes row with empty body
 *
 * Response shape:
 *   { ok, processed, errors, durationMs, timestamp }
 *   processed: [{ slug, body_source: "ai_generated" }]
 *   errors:    [{ slug, message }]
 *
 * Side effects:
 *   - Updates `recipes.ingredients`, `recipes.instructions`,
 *     `recipes.body_source = "ai_generated"`, `recipes.body_generated_at = now()`
 *   - Upserts into `seo_recipes` (insert if missing, update if exists) so the
 *     public /resep/$slug page (which reads from seo_recipes) shows the body.
 *
 * Why TWO table writes: Sprint 5b found that /resep/$slug reads from
 * seo_recipes, but the `recipes` table is the source of truth for the master
 * content. Both need updating so the public surface and any admin tools
 * stay in sync.
 */
export const Route = createFileRoute("/api/admin/fill-recipe-body")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = requireCronSecret(request);
        if (unauthorized) return unauthorized;

        const startTime = Date.now();

        // 1. Parse input
        let body: { slugs?: string[]; fillAllEmpty?: boolean; limit?: number };
        try {
          const raw = await request.json();
          body = z
            .object({
              slugs: z.array(z.string().min(1).max(120)).optional(),
              fillAllEmpty: z.boolean().optional(),
              limit: z.number().int().positive().max(20).optional(),
            })
            .parse(raw);
        } catch (e) {
          return Response.json(
            {
              ok: false,
              error: `Invalid body: ${(e as Error).message}`,
              timestamp: new Date().toISOString(),
            },
            { status: 400 },
          );
        }

        // 2. Resolve target slugs
        let targets: RecipeInput[];
        if (body.slugs && body.slugs.length > 0) {
          const { data: rows, error } = await supabaseAdmin
            .from("recipes")
            .select(
              "slug, title, description, category, cuisine, calories, protein_g, carbs_g, fat_g, servings, tags",
            )
            .in("slug", body.slugs)
            .eq("is_published", true)
            .is("deleted_at", null);
          if (error) {
            return Response.json(
              { ok: false, error: error.message, timestamp: new Date().toISOString() },
              { status: 500 },
            );
          }
          targets = (rows ?? []) as RecipeInput[];
        } else if (body.fillAllEmpty) {
          // Recipes with empty ingredients/instructions AND body_source='seed'
          // (the Sprint 5d-A audit identified these as the 14-row content gap).
          let q = supabaseAdmin
            .from("recipes")
            .select(
              "slug, title, description, category, cuisine, calories, protein_g, carbs_g, fat_g, servings, tags",
            )
            .eq("is_published", true)
            .is("deleted_at", null)
            .or("body_source.eq.seed,body_source.is.null");
          if (body.limit) {
            q = q.limit(body.limit);
          } else {
            q = q.limit(20); // safety cap; one-shot admin call
          }
          const { data: rows, error } = await q;
          if (error) {
            return Response.json(
              { ok: false, error: error.message, timestamp: new Date().toISOString() },
              { status: 500 },
            );
          }
          targets = (rows ?? []).filter((r) => {
            // Only fill if both fields are actually empty (defensive — some
            // 'seed' rows might already have partial content)
            const ingredients = (r as { ingredients?: unknown }).ingredients;
            const instructions = (r as { instructions?: unknown }).instructions;
            const emptyIngredients =
              !ingredients || (Array.isArray(ingredients) && ingredients.length === 0);
            const emptyInstructions =
              !instructions || (Array.isArray(instructions) && instructions.length === 0);
            return emptyIngredients && emptyInstructions;
          }) as RecipeInput[];
        } else {
          return Response.json(
            {
              ok: false,
              error: "Provide either `slugs` (array) or `fillAllEmpty` (true).",
              timestamp: new Date().toISOString(),
            },
            { status: 400 },
          );
        }

        if (targets.length === 0) {
          return Response.json({
            ok: true,
            processed: [],
            errors: [],
            message: "No recipes matched.",
            durationMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          });
        }

        // 3. Process each recipe. Failures on one don't block the rest.
        const processed: Array<{ slug: string; ingredients: number; instructions: number }> = [];
        const errors: Array<{ slug: string; message: string }> = [];

        for (const recipe of targets) {
          try {
            const userPrompt = buildPrompt(recipe);
            const result = await callVexoApi({
              endpoint: "openai/gpt-oss-120b:free",
              text: userPrompt,
              system: SYSTEM_PROMPT,
              timeoutMs: 45_000,
              maxTokens: 2048,
              temperature: 0.3,
            });
            const body = parseAndNormalizeBody(result.data);
            if (!body || !looksHealthy(body)) {
              errors.push({
                slug: recipe.slug,
                message: body
                  ? "Body parsed but failed health check (too long/short)"
                  : "Could not parse Vexo response into RecipeBody",
              });
              continue;
            }

            // 3a. Update recipes table
            const now = new Date().toISOString();
            const { error: updErr } = await supabaseAdmin
              .from("recipes")
              .update({
                ingredients: body.ingredients,
                instructions: body.instructions,
                body_source: "ai_generated",
                body_generated_at: now,
                updated_at: now,
              })
              .eq("slug", recipe.slug)
              .eq("is_published", true);
            if (updErr) {
              errors.push({ slug: recipe.slug, message: `recipes.update: ${updErr.message}` });
              continue;
            }

            // 3b. Upsert seo_recipes so /resep/$slug renders the body.
            // The seo_recipes table is the public marketing surface that
            // /resep/$slug reads from. Without this upsert, /resep/$slug
            // would still show an empty body even after the recipes update.
            const { data: existing } = await supabaseAdmin
              .from("seo_recipes")
              .select("slug")
              .eq("slug", recipe.slug)
              .maybeSingle();

            if (existing) {
              const { error: seoUpdErr } = await supabaseAdmin
                .from("seo_recipes")
                .update({
                  ingredients: body.ingredients,
                  instructions: body.instructions,
                  updated_at: now,
                })
                .eq("slug", recipe.slug);
              if (seoUpdErr) {
                // Non-fatal — recipes table is updated, but public surface
                // might still show empty. Log + continue.
                errors.push({
                  slug: recipe.slug,
                  message: `seo_recipes.update: ${seoUpdErr.message}`,
                });
              }
            } else {
              // Insert a minimal seo_recipes row that mirrors the recipe.
              // /resep/$slug reads more fields than just ingredients, but
              // those already come from seo_recipes; here we copy what we have.
              const { error: seoInsErr } = await supabaseAdmin.from("seo_recipes").insert({
                slug: recipe.slug,
                title: recipe.title,
                description: recipe.description ?? null,
                category: recipe.category ?? null,
                cuisine: recipe.cuisine ?? null,
                image_url: null, // no image until manual upload
                prep_min: 0,
                cook_min: 0,
                total_min: 0,
                servings: recipe.servings ?? 1,
                calories: recipe.calories ?? null,
                protein_g: recipe.protein_g ?? null,
                carbs_g: recipe.carbs_g ?? null,
                fat_g: recipe.fat_g ?? null,
                fiber_g: 0,
                ingredients: body.ingredients,
                instructions: body.instructions,
                tags: recipe.tags ?? [],
                keywords: [],
                is_vegan: false,
                is_vegetarian: false,
                is_halal: true,
                published: true,
                published_at: now,
                created_at: now,
                updated_at: now,
              });
              if (seoInsErr) {
                errors.push({
                  slug: recipe.slug,
                  message: `seo_recipes.insert: ${seoInsErr.message}`,
                });
              }
            }

            processed.push({
              slug: recipe.slug,
              ingredients: body.ingredients.length,
              instructions: body.instructions.length,
            });
          } catch (e) {
            const msg =
              e instanceof VexoApiCallError
                ? `Vexo ${e.status}: ${e.message}`
                : (e as Error).message;
            errors.push({ slug: recipe.slug, message: msg });
          }
        }

        return Response.json({
          ok: true,
          processed,
          errors,
          counts: {
            processed: processed.length,
            errors: errors.length,
            total: targets.length,
          },
          durationMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        });
      },
    },
  },
});
