/**
 * Lazy AI body generation for seed-only articles & recipes.
 * Strategy: metadata is seeded at build time. On first user open, generate
 * the body via Lovable AI Gateway, persist to the row, and serve from DB on
 * subsequent reads (DB itself is the cache).
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { callAiWithGuards } from "@/features/ai/lib/aiGateway.server";

const MODEL = "google/gemini-2.5-flash";

async function chat(system: string, user: string, feature: string): Promise<string> {
  const text = await callAiWithGuards({
    userId: null, // server-side lazy content gen, not user-scoped
    feature,
    skipBudget: true,
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return text.trim();
}

const ARTICLE_SYSTEM =
  "Anda penulis konten kesehatan HealthyU (bahasa Indonesia). " +
  "Tulis artikel edukatif, ramah, berbasis bukti, ~500-700 kata. " +
  "Format Markdown: gunakan ## untuk subjudul, paragraf pendek, daftar bila perlu. " +
  "Sertakan disclaimer ringan di akhir: bukan pengganti saran medis profesional. " +
  "Hindari klaim berlebihan, hindari rekomendasi dosis obat spesifik.";

export async function generateArticleBody(slug: string): Promise<string | null> {
  const { data: art } = await supabaseAdmin
    .from("articles")
    .select("id, title, excerpt, category, body_source, content")
    .eq("slug", slug)
    .maybeSingle();
  if (!art) return null;
  if (art.content && art.content.trim().length > 0) return art.content;
  if (art.body_source !== "seed") return art.content ?? null;

  const prompt =
    `Judul: ${art.title}\nKategori: ${art.category}\n` +
    (art.excerpt ? `Ringkasan: ${art.excerpt}\n` : "") +
    `\nTulis isi artikel lengkap dalam Markdown.`;
  const body = await chat(ARTICLE_SYSTEM, prompt, "content.article.generate");
  if (!body) return null;

  await supabaseAdmin
    .from("articles")
    .update({
      content: body,
      body_source: "ai_generated",
      body_generated_at: new Date().toISOString(),
    })
    .eq("id", art.id);
  return body;
}

const RECIPE_SYSTEM =
  "Anda chef gizi HealthyU (bahasa Indonesia). Untuk resep yang diberikan, " +
  "hasilkan HANYA JSON valid dengan kunci: " +
  '{"ingredients":["string", ...],"instructions":["langkah 1", ...]}. ' +
  "Bahan: 6-12 item dengan takaran Indonesia (sdm, sdt, gram, butir). " +
  "Instruksi: 4-8 langkah singkat dan jelas. " +
  "Tidak ada teks lain di luar JSON.";

export async function generateRecipeBody(
  slug: string,
): Promise<{ ingredients: string[]; instructions: string[] } | null> {
  const { data: rec } = await supabaseAdmin
    .from("recipes")
    .select(
      "id, title, description, category, calories, protein_g, carbs_g, fat_g, servings, ingredients, instructions, body_source",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!rec) return null;
  const hasBody = (rec.ingredients?.length ?? 0) > 0 && (rec.instructions?.length ?? 0) > 0;
  if (hasBody) {
    return { ingredients: rec.ingredients ?? [], instructions: rec.instructions ?? [] };
  }
  if (rec.body_source !== "seed") {
    return { ingredients: rec.ingredients ?? [], instructions: rec.instructions ?? [] };
  }

  const prompt =
    `Resep: ${rec.title}\nKategori: ${rec.category}\nPorsi: ${rec.servings}\n` +
    `Target nutrisi/porsi: ${rec.calories} kkal, P ${rec.protein_g}g / K ${rec.carbs_g}g / L ${rec.fat_g}g\n` +
    (rec.description ? `Deskripsi: ${rec.description}\n` : "");
  const raw = await chat(RECIPE_SYSTEM, prompt, "content.recipe.generate");
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let parsed: { ingredients?: unknown; instructions?: unknown };
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }
  const ingredients = Array.isArray(parsed.ingredients)
    ? parsed.ingredients.filter((x): x is string => typeof x === "string")
    : [];
  const instructions = Array.isArray(parsed.instructions)
    ? parsed.instructions.filter((x): x is string => typeof x === "string")
    : [];
  if (ingredients.length === 0 || instructions.length === 0) return null;

  await supabaseAdmin
    .from("recipes")
    .update({
      ingredients,
      instructions,
      body_source: "ai_generated",
      body_generated_at: new Date().toISOString(),
    })
    .eq("id", rec.id);
  return { ingredients, instructions };
}
