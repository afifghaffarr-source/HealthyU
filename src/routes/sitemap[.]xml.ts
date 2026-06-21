import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { SITE_URL } from "@/lib/seo";

interface SitemapEntry {
  path: string;
  lastmod?: string; // YYYY-MM-DD
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const STATIC_ENTRIES: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/kalkulator", changefreq: "weekly", priority: "0.9" },
  { path: "/kalkulator/bmi", changefreq: "monthly", priority: "0.8" },
  { path: "/kalkulator/bmr", changefreq: "monthly", priority: "0.8" },
  { path: "/kalkulator/tdee", changefreq: "monthly", priority: "0.8" },
  { path: "/kalkulator/body-fat", changefreq: "monthly", priority: "0.8" },
  { path: "/kalkulator/ideal-weight", changefreq: "monthly", priority: "0.8" },
  { path: "/kalkulator/water-intake", changefreq: "monthly", priority: "0.8" },
  { path: "/kalkulator/macro", changefreq: "monthly", priority: "0.8" },
  { path: "/kalkulator/heart-rate-zone", changefreq: "monthly", priority: "0.8" },
  { path: "/kalori", changefreq: "weekly", priority: "0.9" },
  { path: "/olahraga", changefreq: "weekly", priority: "0.9" },
  { path: "/diet", changefreq: "weekly", priority: "0.9" },
  { path: "/artikel", changefreq: "daily", priority: "0.9" },
  { path: "/resep", changefreq: "weekly", priority: "0.9" },
  { path: "/faq", changefreq: "weekly", priority: "0.9" },
];

/** Strip time component from ISO timestamp → YYYY-MM-DD (sitemap spec). */
function toDate(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  // iso like "2026-06-21T00:02:29.263+00:00" or "2026-06-21"
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  return m?.[1];
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const today = new Date().toISOString().split("T")[0];
        // supabaseAdmin is a Proxy in client.server.ts that resolves CF env
        // (AsyncLocalStorage) on first access. Works in both CF Workers
        // (production) and local dev (process.env fallback).
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // Sprint 6b: include `updated_at` so sitemap emits per-URL <lastmod>.
        // Google uses lastmod to decide when to re-crawl. Dynamic content
        // (recipes/articles) get their real DB updated_at; static pages fall
        // back to today's date.
        const [foods, exercises, diets, articles, recipes, faqs] = await Promise.all([
          supabaseAdmin.from("seo_foods").select("slug,updated_at").eq("published", true),
          supabaseAdmin.from("seo_exercises").select("slug,updated_at").eq("published", true),
          supabaseAdmin.from("seo_diet_guides").select("slug,updated_at").eq("published", true),
          supabaseAdmin.from("seo_articles").select("slug,updated_at").eq("published", true),
          supabaseAdmin.from("seo_recipes").select("slug,updated_at").eq("published", true),
          supabaseAdmin.from("seo_faqs").select("slug,updated_at").eq("published", true),
        ]);
        const dynamic: SitemapEntry[] = [
          ...(foods.data ?? []).map((r) => ({
            path: `/kalori/${r.slug}`,
            lastmod: toDate(r.updated_at) ?? today,
            changefreq: "monthly" as const,
            priority: "0.7",
          })),
          ...(exercises.data ?? []).map((r) => ({
            path: `/olahraga/${r.slug}`,
            lastmod: toDate(r.updated_at) ?? today,
            changefreq: "monthly" as const,
            priority: "0.7",
          })),
          ...(diets.data ?? []).map((r) => ({
            path: `/diet/${r.slug}`,
            lastmod: toDate(r.updated_at) ?? today,
            changefreq: "monthly" as const,
            priority: "0.7",
          })),
          ...(articles.data ?? []).map((r) => ({
            path: `/artikel/${r.slug}`,
            lastmod: toDate(r.updated_at) ?? today,
            changefreq: "weekly" as const,
            priority: "0.8",
          })),
          ...(recipes.data ?? []).map((r) => ({
            path: `/resep/${r.slug}`,
            lastmod: toDate(r.updated_at) ?? today,
            changefreq: "weekly" as const,
            priority: "0.8",
          })),
          ...(faqs.data ?? []).map((r) => ({
            path: `/faq/${r.slug}`,
            lastmod: toDate(r.updated_at) ?? today,
            changefreq: "monthly" as const,
            priority: "0.7",
          })),
        ];
        // Static entries use today's date (they're "site-wide" updates).
        const statics: SitemapEntry[] = STATIC_ENTRIES.map((e) => ({
          ...e,
          lastmod: e.lastmod ?? today,
        }));
        const urls = [...statics, ...dynamic].map((e) =>
          [
            `  <url>`,
            `    <loc>${SITE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
