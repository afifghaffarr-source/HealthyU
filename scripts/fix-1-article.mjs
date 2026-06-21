#!/usr/bin/env bun
/**
 * One-off: fill the 1 stubborn article that Vexo 504'd on in Sprint 5d-C.
 * Uses a smaller max_tokens to avoid the 504 timeout.
 *
 * Run: bun run scripts/fix-1-article.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const envPath = join(process.env.HOME || "/home/ubuntu", ".config/healthyu/production.env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VEXO_KEY = process.env.VEXO_API_KEY;
const VEXO_BASE = process.env.VEXO_BASE_URL || "https://vexoapi.site";

if (!SUPABASE_URL || !SUPABASE_KEY || !VEXO_KEY) {
  console.error("Missing env");
  process.exit(1);
}

const SLUG = "mengenal-makronutrien-karbo-protein-lemak";

// 1. Fetch article meta from Supabase
const articleRes = await fetch(
  `${SUPABASE_URL}/rest/v1/articles?slug=eq.${SLUG}&select=slug,title,excerpt,category,reading_time_minutes,meta_description,keywords`,
  {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  },
);
const [a] = await articleRes.json();
if (!a) {
  console.error("Article not found:", SLUG);
  process.exit(1);
}
console.log("Found:", a.title, `(category=${a.category}, ${a.reading_time_minutes} min)`);

// 2. Build compact prompt — half size of full prompt, faster + less likely to 504
const userPrompt = `Tulis artikel kesehatan Indonesia (markdown) dengan target:
- Topik: ${a.title}
- Excerpt: ${a.excerpt}
- Target durasi: ${a.reading_time_minutes} menit (~${a.reading_time_minutes * 200} kata)
- Keyword: ${a.keywords?.join(", ") || "makronutrien, karbo, protein, lemak"}

Struktur WAJIB:
- 1 paragraf intro (max 3 kalimat)
- 3-4 section utama (## Heading 2), tiap section 1-2 paragraf pendek
- 1 conclusion
- 1 FAQ section (## FAQ) dengan 3 Q&A (### Q / A)

Aturan:
- Bahasa Indonesia awam, supportive, evidence-based
- Satuan: gram, sdm, sdt
- Hindari klaim medis absolut
- NO emoji, NO image markdown
- NO placeholder, NO prefatory prose
- Output HANYA markdown artikel, mulai langsung dari # heading pertama`;

const systemPrompt =
  "Kamu adalah penulis kesehatan Indonesia yang evidence-based. Output HANYA markdown artikel.";

const t0 = Date.now();
console.log("Calling Vexo (max_tokens=2000, target: <60s)...");

let content = null;
let lastError = null;

// Vexo uses OpenRouter model names with vendor prefix
const models = ["openai/gpt-oss-120b:free", "google/gemini-2.5-flash", "llama-3.1-8b-instant"];

for (const model of models) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`  attempt ${attempt} with ${model}...`);
      const r = await fetch(`${VEXO_BASE}/api/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VEXO_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });
      if (!r.ok) {
        const body = await r.text();
        lastError = `${model} → ${r.status}: ${body.slice(0, 200)}`;
        console.log(`    failed: ${lastError}`);
        if (r.status === 504 || r.status === 502 || r.status === 429) {
          await new Promise((res) => setTimeout(res, 3000));
          continue;
        }
        continue;
      }
      const json = await r.json();
      content = json.choices?.[0]?.message?.content;
      if (content && content.length > 600) {
        console.log(
          `    ✅ got ${content.length} chars from ${model} (${((Date.now() - t0) / 1000).toFixed(1)}s)`,
        );
        break;
      }
      console.log(`    too short (${content?.length || 0} chars), retrying...`);
    } catch (e) {
      lastError = `${model} → ${e.message}`;
      console.log(`    error: ${lastError}`);
      await new Promise((res) => setTimeout(res, 2000));
    }
  }
  if (content && content.length > 600) break;
}

if (!content || content.length < 600) {
  console.error("\n❌ All Vexo attempts failed. Last error:", lastError);
  process.exit(1);
}

// 3. Clean response
content = content.trim();
// Strip code fences
const fences = [...content.matchAll(/```(?:markdown|md)?\s*([\s\S]*?)```/g)];
if (fences.length > 0) content = fences[fences.length - 1][1].trim();
// Strip control chars

content = content.replace(/[-\b\u000b\f\u000e-\u001f]/g, "");

// Validate
if (content.length < 600) {
  console.error("Cleaned content too short:", content.length);
  process.exit(1);
}
if (content.length > 20_000) {
  console.warn("Content > 20K, truncating to 18000");
  content = content.slice(0, 18000);
}

// 4. Update articles table
console.log("\nUpdating articles table...");
const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/articles?slug=eq.${SLUG}`, {
  method: "PATCH",
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  },
  body: JSON.stringify({
    content,
    body_source: "ai_generated",
    body_generated_at: new Date().toISOString(),
    content_html: null, // Will be regenerated on next read
  }),
});
if (!updateRes.ok) {
  const body = await updateRes.text();
  console.error("Update failed:", updateRes.status, body);
  process.exit(1);
}
console.log("  ✅ articles.content updated");

// 5. Upsert seo_articles (so the public page finds it)
// First check schema
const seoCheck = await fetch(`${SUPABASE_URL}/rest/v1/seo_articles?slug=eq.${SLUG}&select=slug`, {
  headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
});
const seoExisting = await seoCheck.json();

const seoPayload = {
  slug: a.slug,
  title: a.title,
  excerpt: a.excerpt,
  category: a.category,
  content,
  reading_time_minutes: a.reading_time_minutes,
  meta_description: a.meta_description || a.excerpt,
  meta_title: a.title,
  keywords: a.keywords || [],
  image_url: null,
  author_name: "HealthyU",
  published: true,
  published_at: new Date().toISOString(),
};

console.log("Upserting seo_articles...");
const seoRes = await fetch(`${SUPABASE_URL}/rest/v1/seo_articles`, {
  method: "POST",
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  },
  body: JSON.stringify(seoPayload),
});
if (!seoRes.ok) {
  const body = await seoRes.text();
  console.error("SEO upsert failed:", seoRes.status, body);
  // Not fatal — article body is the priority. seo_articles might have a different schema.
  console.warn("Continuing — article body is updated, but SEO view might be stale.");
} else {
  console.log(`  ✅ seo_articles ${seoExisting.length > 0 ? "updated" : "inserted"}`);
}

console.log(`\n✅ DONE in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`   content: ${content.length} chars`);
console.log(`   body_source: ai_generated`);
console.log(`\nNext: verify GET /artikel/${SLUG} returns 200`);
