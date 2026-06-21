import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireCronSecret } from "@/lib/cronAuth.server";
import { callVexoApi, VexoApiCallError } from "@/features/ai/lib/vexoAdapter.server";
import {
  buildPrompt,
  SYSTEM_PROMPT,
  parseAndNormalizeArticle,
  looksHealthy,
  type ArticleInput,
} from "@/features/articles/lib/articleBodyFill.lib";

/**
 * Admin: fill empty article bodies via Vexo.
 *
 * Sprint 5d-C: addresses the content gap where 15 published articles have
 * `content = NULL` (body_source: "seed"). They appear in listings but
 * render with no body.
 *
 * Auth: CRON_SECRET via `x-cron-secret` header or `Authorization: Bearer`.
 * Same pattern as /api/admin/fill-recipe-body (Sprint 5d-B) and
 * /api/public/hooks/* — shared secret, fail-closed if unset.
 *
 * Usage:
 *   POST /api/admin/fill-article-body
 *   Headers: x-cron-secret: <CRON_SECRET>
 *   Body:    { "slugs": ["panduan-diet-defisit-kalori-pemula", ...] }
 *            OR
 *            { "fillAllEmpty": true }   // fill every article with empty body
 *
 * Response shape:
 *   { ok, processed, errors, durationMs, timestamp }
 *   processed: [{ slug, body_source: "ai_generated", content_length }]
 *   errors:    [{ slug, message }]
 *
 * Side effects:
 *   - Updates `articles.content` (text/markdown)
 *   - Updates `articles.body_source = "ai_generated"`, `articles.body_generated_at = now()`
 *   - Upserts into `seo_articles` (insert if missing, update if exists)
 *     so the public article page shows the new content.
 */
export const Route = createFileRoute("/api/admin/fill-article-body")({
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
        let targets: ArticleInput[];
        if (body.slugs && body.slugs.length > 0) {
          const { data: rows, error } = await supabaseAdmin
            .from("articles")
            .select("slug, title, excerpt, category, tags, language, reading_time_minutes")
            .in("slug", body.slugs)
            .eq("is_published", true)
            .is("deleted_at", null);
          if (error) {
            return Response.json(
              { ok: false, error: error.message, timestamp: new Date().toISOString() },
              { status: 500 },
            );
          }
          targets = (rows ?? []) as ArticleInput[];
        } else if (body.fillAllEmpty) {
          // Articles with empty content AND body_source='seed' or null
          // (the Sprint 5d-C audit identified these as the 15-row content gap).
          let q = supabaseAdmin
            .from("articles")
            .select("slug, title, excerpt, category, tags, language, reading_time_minutes")
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
            // Only fill if content is actually empty
            const content = (r as { content?: unknown }).content;
            const emptyContent = !content || (typeof content === "string" && content.trim() === "");
            return emptyContent;
          }) as ArticleInput[];
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
            message: "No articles matched.",
            durationMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          });
        }

        // 3. Process each article. Failures on one don't block the rest.
        const processed: Array<{
          slug: string;
          content_length: number;
        }> = [];
        const errors: Array<{ slug: string; message: string }> = [];

        for (const article of targets) {
          try {
            const userPrompt = buildPrompt(article);
            const result = await callVexoApi({
              endpoint: "openai/gpt-oss-120b:free",
              text: userPrompt,
              system: SYSTEM_PROMPT,
              timeoutMs: 60_000, // articles need more tokens than recipes
              maxTokens: 4096,
              temperature: 0.4,
            });
            const parsed = parseAndNormalizeArticle(result.data);
            if (!parsed || !looksHealthy(parsed)) {
              errors.push({
                slug: article.slug,
                message: parsed
                  ? "Body parsed but failed health check (too long/short or no structure)"
                  : "Could not parse Vexo response into ArticleBody",
              });
              continue;
            }

            // 3a. Update articles table
            const now = new Date().toISOString();
            const { error: updErr } = await supabaseAdmin
              .from("articles")
              .update({
                content: parsed.content,
                body_source: "ai_generated",
                body_generated_at: now,
                updated_at: now,
              })
              .eq("slug", article.slug)
              .eq("is_published", true);
            if (updErr) {
              errors.push({ slug: article.slug, message: `articles.update: ${updErr.message}` });
              continue;
            }

            // 3b. Upsert seo_articles so the public article page renders the body.
            // The seo_articles table is the marketing surface for the article
            // page. Without this upsert, the public surface would still show
            // empty content even after the articles update.
            const { data: existing } = await supabaseAdmin
              .from("seo_articles")
              .select("slug")
              .eq("slug", article.slug)
              .maybeSingle();

            if (existing) {
              const { error: seoUpdErr } = await supabaseAdmin
                .from("seo_articles")
                .update({
                  content: parsed.content,
                  updated_at: now,
                })
                .eq("slug", article.slug);
              if (seoUpdErr) {
                // Non-fatal — articles table is updated, but public surface
                // might still show empty. Log + continue.
                errors.push({
                  slug: article.slug,
                  message: `seo_articles.update: ${seoUpdErr.message}`,
                });
              }
            } else {
              // Insert a minimal seo_articles row that mirrors the article.
              // Most fields (title, excerpt, category, tags) already come
              // from the articles table; we copy what we have and add the
              // generated content.
              const { error: seoInsErr } = await supabaseAdmin.from("seo_articles").insert({
                slug: article.slug,
                title: article.title,
                excerpt: article.excerpt ?? null,
                content: parsed.content,
                category: article.category ?? null,
                tags: article.tags ?? [],
                keywords: [],
                author_name: "Tim HealthyU",
                image_url: null,
                reading_time_minutes: article.reading_time_minutes ?? 5,
                published: true,
                published_at: now,
                created_at: now,
                updated_at: now,
              });
              if (seoInsErr) {
                errors.push({
                  slug: article.slug,
                  message: `seo_articles.insert: ${seoInsErr.message}`,
                });
              }
            }

            processed.push({
              slug: article.slug,
              content_length: parsed.content.length,
            });
          } catch (e) {
            const msg =
              e instanceof VexoApiCallError
                ? `Vexo ${e.status}: ${e.message}`
                : (e as Error).message;
            errors.push({ slug: article.slug, message: msg });
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
