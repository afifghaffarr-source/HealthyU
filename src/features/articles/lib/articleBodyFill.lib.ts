/**
 * Article body fill — pure logic for AI-generated article content.
 *
 * Sprint 5d-C: addresses the content gap where 15 published articles have
 * `content = NULL` (body_source: "seed"). These articles show up in listings
 * but render with empty body.
 *
 * Pattern mirrors `recipeBodyFill.lib.ts` (Sprint 5d-B) — pure logic, zero
 * I/O, so the prompt + parser are unit-testable with real Vexo response
 * shapes as fixtures.
 *
 * The admin route lives at src/routes/api/admin/fill-article-body.ts and is
 * guarded by `requireCronSecret`.
 */

// ──────────────────────────────────────────────────────────────────────
// Input shape (mirrors what the admin route reads from `articles` row)
// ──────────────────────────────────────────────────────────────────────

export type ArticleInput = {
  slug: string;
  title: string;
  excerpt?: string | null;
  category?: string | null;
  tags?: string[] | null;
  language?: string | null;
  reading_time_minutes?: number | null;
};

// ──────────────────────────────────────────────────────────────────────
// Prompt builder
// ──────────────────────────────────────────────────────────────────────

/**
 * Build the user prompt for the article body generation call.
 *
 * Output contract: plain Markdown text (H2/H3 headings, paragraphs, lists).
 * Indonesian audience, evidence-based health content, no medical claims
 * that need a doctor disclaimer.
 */
export function buildPrompt(a: ArticleInput): string {
  const lines: string[] = [
    "Buatkan artikel kesehatan Indonesia lengkap untuk:",
    `Judul: ${a.title}`,
    a.excerpt ? `Ringkasan: ${a.excerpt}` : null,
    a.category ? `Kategori: ${a.category}` : null,
    a.tags?.length ? `Tag: ${a.tags.join(", ")}` : null,
    `Target bahasa: ${a.language ?? "id"}`,
    a.reading_time_minutes
      ? `Target durasi baca: ${a.reading_time_minutes} menit (~${a.reading_time_minutes * 200} kata)`
      : null,
  ].filter(Boolean) as string[];

  lines.push(
    "",
    "Format WAJIB Markdown dengan struktur:",
    "- 1 introduction (1 paragraf pembuka, max 3 kalimat)",
    "- 3-5 section utama (## Heading 2)",
    "- Tiap section: 2-4 paragraf + optional bullet list",
    "- 1 conclusion (1 paragraf penutup + call-to-action ringan)",
    "- 1 FAQ section (## FAQ) dengan 3-5 Q&A (### Question? / answer)",
    "",
    "Aturan:",
    "- Nada: informatif, supportive, non-judgmental (audien orang Indonesia yang lagi diet/sehat)",
    "- Pakai satuan Indonesia: gram, kg, ml, liter, sdm, sdt",
    "- Hindari klaim medis absolut; pakai 'umumnya', 'banyak penelitian menunjukkan', 'konsultasikan dengan dokter jika...'",
    "- Jangan pakai emoji atau markdown image (![]())",
    "- NO placeholder text, NO '[insert here]', NO '[TODO]'",
    "- Output HANYA markdown artikel (no prefatory text, no 'Berikut artikelnya:')",
  );

  return lines.join("\n");
}

/** System prompt — short, sets persona + role. */
export const SYSTEM_PROMPT =
  "Kamu adalah penulis kesehatan Indonesia yang evidence-based dan supportive. " +
  "Tulis dengan bahasa yang mudah dipahami awam, sertakan tips praktis, dan " +
  "selalu rujuk ke sumber terpercaya (WHO, Kemenkes, jurnal) jika menyebut data. " +
  "Selalu respond dengan Markdown sesuai instruksi user.";

// ──────────────────────────────────────────────────────────────────────
// Response parser — handles Vexo quirks (Sprint 5a lessons applied)
// ──────────────────────────────────────────────────────────────────────

export type ArticleBody = {
  content: string;
};

/**
 * Strip markdown ```json fences + control chars from a raw model response.
 * For articles, the model is expected to return plain markdown, but some
 * models wrap it in code fences — handle both.
 */
function extractMarkdown(raw: string): string {
  let s = raw.trim();
  // eslint-disable-next-line no-control-regex, no-irregular-whitespace
  s = s.replace(/[--]/g, "");

  // Strip markdown code fences if the model wrapped its response
  const fencePattern = /```(?:markdown|md)?\s*([\s\S]*?)```/g;
  const fences = [...s.matchAll(fencePattern)];
  if (fences.length > 0) {
    return fences[fences.length - 1][1].trim();
  }

  return s;
}

/**
 * Parse a raw Vexo response into an ArticleBody.
 *
 * Handles known Vexo quirks:
 * - Sometimes wraps in ```markdown ... ``` fences
 * - Sometimes prefixes with "Berikut artikelnya:" or similar
 * - Sometimes includes prefatory prose before the actual article
 *
 * Strategy: find the first H1/H2 heading (`#` or `##` at start of line)
 * and take everything from there to the end. If no heading found, take
 * the whole cleaned response.
 *
 * Returns null if the response is too short to be a real article.
 */
export function parseAndNormalizeArticle(raw: string): ArticleBody | null {
  const cleaned = extractMarkdown(raw);

  // Find the first markdown heading (# or ## at line start) — that's where
  // the real article body starts. Anything before that is prefatory chatter
  // ("Berikut artikelnya:", "Sure, here's the article:", etc.).
  const headingMatch = cleaned.match(/^#{1,2}\s+\S/m);
  const content = headingMatch ? cleaned.slice(headingMatch.index ?? 0) : cleaned;

  // Reject if too short to be a real article body
  if (content.length < 600) return null;

  return { content: content.trim() };
}

/**
 * Final quality check — reject articles that look low-quality.
 *
 * Cheap heuristic: reject if too long (>20K chars likely means model went
 * off-topic or repeated itself) or if the content has no headings at all
 * (no markdown structure = probably a prose dump).
 */
export function looksHealthy(body: ArticleBody): boolean {
  if (body.content.length < 600) return false;
  if (body.content.length > 20_000) return false;

  // Must have at least 2 markdown headings (## or ###)
  const headingCount = (body.content.match(/^#{1,3}\s+/gm) ?? []).length;
  if (headingCount < 2) return false;

  // Must have at least 2 paragraphs (split by double newlines)
  const paragraphs = body.content.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (paragraphs.length < 4) return false;

  return true;
}
