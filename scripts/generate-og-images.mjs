#!/usr/bin/env bun
/**
 * Sprint 6b - OG image generator.
 *
 * Pre-generates 1200x630 PNG og:image for every published recipe + article
 * at build time, so the runtime Worker doesn't need satori/resvg (which would
 * push the Worker bundle over the 3 MiB Cloudflare free-tier limit).
 *
 * Output:
 *   public/og/recipes/{slug}.png
 *   public/og/articles/{slug}.png
 *   public/og/site.png                (default fallback)
 *
 * Usage:
 *   bun run scripts/generate-og-images.mjs
 *
 * Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or read from production.env)
 */

import {
  readFileSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

// ---------- env ----------
const envPath = join(process.env.HOME || "/home/ubuntu", ".config/healthyu/production.env");
if (existsSync(envPath)) {
  const txt = readFileSync(envPath, "utf8");
  for (const line of txt.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// ---------- paths ----------
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FONT_REGULAR = join(ROOT, "public/fonts/geist-regular.ttf");
const FONT_MEDIUM = join(ROOT, "public/fonts/geist-medium.ttf");
const FONT_BOLD = join(ROOT, "public/fonts/geist-bold.ttf");
const OUT_DIR = join(ROOT, "public/og");
const RECIPE_DIR = join(OUT_DIR, "recipes");
const ARTICLE_DIR = join(OUT_DIR, "articles");

mkdirSync(RECIPE_DIR, { recursive: true });
mkdirSync(ARTICLE_DIR, { recursive: true });

// ---------- helpers ----------
async function supabase(path, opts = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const r = await fetch(url, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Supabase ${path} → ${r.status}: ${body.slice(0, 200)}`);
  }
  return r.json();
}

function stripHtml(s, max = 110) {
  if (!s) return "";
  const t = s
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

function escapeXml(s) {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function loadFonts() {
  for (const p of [FONT_REGULAR, FONT_MEDIUM, FONT_BOLD]) {
    if (!existsSync(p)) throw new Error(`Font not found: ${p}`);
  }
  return [readFileSync(FONT_REGULAR), readFileSync(FONT_MEDIUM), readFileSync(FONT_BOLD)];
}

// ---------- card templates ----------
const W = 1200;
const H = 630;

// Brand colors
const COLORS = {
  bg: "#0a1628", // deep navy
  bg2: "#142441", // navy gradient end
  accent: "#22c55e", // healthyU green
  accent2: "#4ade80",
  text: "#ffffff",
  textMuted: "#94a3b8",
  textDim: "#cbd5e1",
  border: "#1e3a5f",
  white: "#ffffff",
};

function recipeCard({ title, excerpt, calories, protein, carbs, fat, prepTime, servings }) {
  return {
    type: "div",
    props: {
      style: {
        width: W,
        height: H,
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(135deg, ${COLORS.bg} 0%, ${COLORS.bg2} 100%)`,
        fontFamily: "Geist",
        color: COLORS.text,
        position: "relative",
        padding: 60,
      },
      children: [
        // Top bar: brand + category badge
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          width: 56,
                          height: 56,
                          borderRadius: 16,
                          background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent2})`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 32,
                          fontWeight: 700,
                          color: COLORS.bg,
                        },
                        children: "H",
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: 32,
                          fontWeight: 700,
                          letterSpacing: -0.5,
                        },
                        children: "HealthyU",
                      },
                    },
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    padding: "12px 24px",
                    borderRadius: 999,
                    background: "rgba(34, 197, 94, 0.15)",
                    border: `2px solid ${COLORS.accent}`,
                    color: COLORS.accent2,
                    fontSize: 22,
                    fontWeight: 600,
                  },
                  children: "🍽 Resep",
                },
              },
            ],
          },
        },
        // Spacer
        { type: "div", props: { style: { height: 40, display: "flex" } } },
        // Title
        {
          type: "div",
          props: {
            style: {
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -1.5,
              color: COLORS.white,
              display: "flex",
            },
            children: title,
          },
        },
        // Spacer
        { type: "div", props: { style: { height: 24, display: "flex" } } },
        // Excerpt
        {
          type: "div",
          props: {
            style: {
              fontSize: 26,
              lineHeight: 1.4,
              color: COLORS.textDim,
              maxWidth: 1000,
              display: "flex",
            },
            children: excerpt,
          },
        },
        // Spacer (flex)
        { type: "div", props: { style: { flex: 1, display: "flex" } } },
        // Bottom: nutrition stats
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              gap: 20,
              width: "100%",
            },
            children: [
              nutritionChip("🔥", `${calories || "—"}`, "kalori"),
              nutritionChip("💪", `${protein || "—"}g`, "protein"),
              nutritionChip("🌾", `${carbs || "—"}g`, "karbo"),
              nutritionChip("🥑", `${fat || "—"}g`, "lemak"),
              nutritionChip("⏱", `${prepTime || "—"}`, "menit"),
              nutritionChip("🍴", `${servings || "—"}`, "porsi"),
            ],
          },
        },
        // Footer URL
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 30,
              paddingTop: 24,
              borderTop: `1px solid ${COLORS.border}`,
              fontSize: 20,
              color: COLORS.textMuted,
            },
            children: ["healthyu.web.id", "AI nutrition coach untuk Indonesia"],
          },
        },
      ],
    },
  };
}

function nutritionChip(emoji, value, label) {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px 18px",
        background: "rgba(255, 255, 255, 0.06)",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        flex: 1,
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 26,
              fontWeight: 700,
              color: COLORS.white,
            },
            children: [emoji, value],
          },
        },
        {
          type: "div",
          props: {
            style: {
              fontSize: 16,
              color: COLORS.textMuted,
              marginTop: 4,
            },
            children: label,
          },
        },
      ],
    },
  };
}

function articleCard({ title, excerpt, category, readTime }) {
  return {
    type: "div",
    props: {
      style: {
        width: W,
        height: H,
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(135deg, #0f172a 0%, #1e293b 100%)`,
        fontFamily: "Geist",
        color: COLORS.text,
        padding: 60,
      },
      children: [
        // Top bar
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          width: 56,
                          height: 56,
                          borderRadius: 16,
                          background: `linear-gradient(135deg, #3b82f6, #60a5fa)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 32,
                          fontWeight: 700,
                          color: COLORS.bg,
                        },
                        children: "H",
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: 32,
                          fontWeight: 700,
                          letterSpacing: -0.5,
                        },
                        children: "HealthyU",
                      },
                    },
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    padding: "12px 24px",
                    borderRadius: 999,
                    background: "rgba(59, 130, 246, 0.15)",
                    border: "2px solid #3b82f6",
                    color: "#93c5fd",
                    fontSize: 22,
                    fontWeight: 600,
                  },
                  children: `📖 ${category || "Artikel"}`,
                },
              },
            ],
          },
        },
        { type: "div", props: { style: { height: 50, display: "flex" } } },
        {
          type: "div",
          props: {
            style: {
              fontSize: 60,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -1.5,
              color: COLORS.white,
              display: "flex",
            },
            children: title,
          },
        },
        { type: "div", props: { style: { height: 28, display: "flex" } } },
        {
          type: "div",
          props: {
            style: {
              fontSize: 26,
              lineHeight: 1.4,
              color: COLORS.textDim,
              maxWidth: 1000,
              display: "flex",
            },
            children: excerpt,
          },
        },
        { type: "div", props: { style: { flex: 1, display: "flex" } } },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 24,
              borderTop: `1px solid ${COLORS.border}`,
              fontSize: 20,
              color: COLORS.textMuted,
            },
            children: ["healthyu.web.id", `⏱ ${readTime || 5} menit baca`],
          },
        },
      ],
    },
  };
}

function siteCard() {
  return {
    type: "div",
    props: {
      style: {
        width: W,
        height: H,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, #052e16 0%, #14532d 50%, #166534 100%)`,
        fontFamily: "Geist",
        color: COLORS.white,
        padding: 60,
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              width: 140,
              height: 140,
              borderRadius: 32,
              background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent2})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 80,
              fontWeight: 700,
              color: "#052e16",
              marginBottom: 40,
            },
            children: "H",
          },
        },
        {
          type: "div",
          props: {
            style: {
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: -3,
              marginBottom: 20,
            },
            children: "HealthyU",
          },
        },
        {
          type: "div",
          props: {
            style: {
              fontSize: 36,
              color: "#bbf7d0",
              fontWeight: 500,
              marginBottom: 50,
            },
            children: "AI nutrition coach untuk Indonesia",
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              gap: 16,
              fontSize: 24,
              color: "#d1fae5",
            },
            children: [
              "🍽 Resep sehat",
              "💪 Diet",
              "📊 Kalkulator kalori",
              "🕌 Puasa & jadwal sholat",
            ],
          },
        },
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              bottom: 40,
              fontSize: 22,
              color: "#86efac",
            },
            children: "healthyu.web.id",
          },
        },
      ],
    },
  };
}

// ---------- renderer ----------
async function renderToPng(tree) {
  const [regular, medium, bold] = await loadFonts();
  const svg = await satori(tree, {
    width: W,
    height: H,
    fonts: [
      { name: "Geist", data: regular, weight: 400, style: "normal" },
      { name: "Geist", data: medium, weight: 500, style: "normal" },
      { name: "Geist", data: bold, weight: 700, style: "normal" },
    ],
  });
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: W },
    background: "transparent",
  });
  return resvg.render().asPng();
}

// ---------- main ----------
async function main() {
  const t0 = Date.now();
  console.log("🖼  Sprint 6b - generating OG images...\n");

  // 1. Site default card
  console.log("→ site card");
  const sitePng = await renderToPng(siteCard());
  writeFileSync(join(OUT_DIR, "site.png"), sitePng);

  // 2. Recipes
  console.log("→ fetching recipes...");
  const recipes = await supabase(
    "recipes?is_published=eq.true&select=slug,title,description,calories,protein_g,carbs_g,fat_g,prep_min,servings&order=slug",
  );
  console.log(`  ${recipes.length} published recipes`);

  let ok = 0,
    fail = 0;
  for (const r of recipes) {
    const out = join(RECIPE_DIR, `${r.slug}.png`);
    try {
      const tree = recipeCard({
        title: r.title || "Resep Sehat",
        excerpt: stripHtml(r.description, 110),
        calories: r.calories,
        protein: r.protein_g,
        carbs: r.carbs_g,
        fat: r.fat_g,
        prepTime: r.prep_min,
        servings: r.servings,
      });
      const png = await renderToPng(tree);
      writeFileSync(out, png);
      ok++;
    } catch (e) {
      console.error(`  ❌ ${r.slug}: ${e.message.slice(0, 100)}`);
      fail++;
    }
  }
  console.log(`  recipes: ${ok} ok, ${fail} failed`);

  // 3. Articles
  console.log("\n→ fetching articles...");
  const articles = await supabase(
    "articles?is_published=eq.true&select=slug,title,excerpt,category,reading_time_minutes&order=slug",
  );
  console.log(`  ${articles.length} published articles`);

  ok = 0;
  fail = 0;
  for (const a of articles) {
    const out = join(ARTICLE_DIR, `${a.slug}.png`);
    try {
      const tree = articleCard({
        title: a.title || "Artikel",
        excerpt: stripHtml(a.excerpt, 110),
        category: a.category,
        readTime: a.reading_time_minutes,
      });
      const png = await renderToPng(tree);
      writeFileSync(out, png);
      ok++;
    } catch (e) {
      console.error(`  ❌ ${a.slug}: ${e.message.slice(0, 100)}`);
      fail++;
    }
  }
  console.log(`  articles: ${ok} ok, ${fail} failed`);

  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✅ Done in ${dt}s`);
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
