/**
 * Recipe body fill — pure logic for AI-generated ingredients + instructions.
 *
 * Sprint 5d-B: addresses the content gap where 14 published recipes have
 * empty `ingredients` and `instructions` columns (`body_source: "seed"`).
 * These recipes show up in /resep listings but render with no body content.
 *
 * This module is intentionally pure (no I/O, no env reads) so the
 * `buildPrompt` + `parseAndNormalizeBody` functions are unit-testable with
 * real Vexo response shapes as fixtures (the Sprint 5a lesson — never
 * design schemas from synthesized data).
 *
 * The admin route that wires this to Vexo + Supabase lives in
 * src/routes/api/admin/fill-recipe-body.ts and is guarded by
 * `requireCronSecret` (same pattern as other /api/public/hooks/* routes).
 */

// ──────────────────────────────────────────────────────────────────────
// Input shape (mirrors what the admin route reads from `recipes` row)
// ──────────────────────────────────────────────────────────────────────

export type RecipeInput = {
  slug: string;
  title: string;
  description?: string | null;
  category?: string | null;
  cuisine?: string | null;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  servings?: number | null;
  tags?: string[] | null;
};

// ──────────────────────────────────────────────────────────────────────
// Prompt builder
// ──────────────────────────────────────────────────────────────────────

/**
 * Build the user prompt for the recipe body generation call.
 *
 * Indonesian-language prompt — model performs better in the target language
 * (matches the body language of `recipes.description` and Indonesian
 * audience).
 *
 * Output contract: lowercase JSON keys `ingredients` (string[]) and
 * `instructions` (string[]). Quantities should be Indonesian units (gram,
 * sdm, sdt, buah, siung).
 */
export function buildPrompt(r: RecipeInput): string {
  const lines: string[] = [
    "Buatkan resep Indonesia lengkap untuk:",
    `Judul: ${r.title}`,
    r.category ? `Kategori: ${r.category}` : null,
    r.cuisine ? `Masakan: ${r.cuisine}` : null,
    r.description ? `Deskripsi: ${r.description}` : null,
    r.calories != null ? `Estimasi kalori: ${r.calories} kcal` : null,
    r.protein_g != null ? `Protein: ${r.protein_g}g` : null,
    r.carbs_g != null ? `Karbo: ${r.carbs_g}g` : null,
    r.fat_g != null ? `Lemak: ${r.fat_g}g` : null,
    r.servings != null ? `Porsi: ${r.servings}` : null,
    r.tags?.length ? `Tag: ${r.tags.join(", ")}` : null,
  ].filter(Boolean) as string[];

  lines.push(
    "",
    "Output WAJIB JSON valid (lowercase keys, no markdown fences):",
    "{",
    '  "ingredients": ["bahan 1 dengan takaran spesifik", "bahan 2..."],',
    '  "instructions": ["langkah 1 detail (waktu + teknik)", "langkah 2..."]',
    "}",
    "",
    "Aturan:",
    "- Bahan harus readily available di pasar tradisional / supermarket Indonesia",
    "- Gunakan satuan Indonesia: gram, ml, sdm, sdt, buah, siung, batang",
    "- 5-12 bahan, 4-10 langkah",
    "- Instructions harus jelas (waktu masak, teknik, urutan)",
    "- NO markdown, NO komentar, NO teks di luar JSON",
  );

  return lines.join("\n");
}

/** System prompt — short, sets persona + role. */
export const SYSTEM_PROMPT =
  "Kamu adalah chef Indonesia yang ahli dalam resep rumahan sehat. " +
  "Berikan resep yang realistis dengan bahan yang mudah didapat di Indonesia. " +
  "Selalu respond dengan JSON valid sesuai instruksi user.";

// ──────────────────────────────────────────────────────────────────────
// Response parser — handles Vexo quirks (Sprint 5a lessons applied)
// ──────────────────────────────────────────────────────────────────────

/**
 * Shape we expect from the model after normalization.
 */
export type RecipeBody = {
  ingredients: string[];
  instructions: string[];
};

/**
 * Strip markdown ```json fences + control chars from a raw model response.
 * Same logic as `extractJsonFromResponse` in aiGateway but inlined here so
 * this lib has zero dependency on the AI gateway module (which pulls in
 * CF env reads, budgets, and other side-effects).
 */
function extractJson(raw: string): string {
  let s = raw.trim();
  // Strip control characters (except \t, \n, \r) that can break JSON.parse.
  // Same pattern used in aiGateway.server.ts:extractJsonFromResponse.
  // eslint-disable-next-line no-control-regex, no-irregular-whitespace
  s = s.replace(/[\u0000--]/g, "");
  // Strip markdown code fences (```json ... ``` or ``` ... ```) — handles the
  // case where the model wraps its JSON in a code block. We use a non-greedy
  // match so the LAST fence pair wins (in case of multiple fences in prose).
  const fencePattern = /```(?:json)?\s*([\s\S]*?)```/g;
  const fences = [...s.matchAll(fencePattern)];
  if (fences.length > 0) {
    return fences[fences.length - 1][1].trim();
  }
  if (s.startsWith("{") || s.startsWith("[")) return s;
  const start = s.search(/[{[]/);
  if (start === -1) return s;
  return s.slice(start);
}

/**
 * Normalize a single string array field (ingredients OR instructions).
 * Accepts: array of strings, single string, newline-separated string.
 * Returns: array of non-empty trimmed strings.
 */
function normalizeStringArray(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map((x) => (typeof x === "string" ? x : typeof x === "number" ? String(x) : ""))
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  if (typeof input === "string") {
    // Split on newlines OR numbered list prefix ("1. ", "2) ", etc.)
    return input
      .split(/\n|(?=^\s*\d+[.)]\s)/m)
      .map((s) => s.replace(/^\s*\d+[.)]\s+/, "").trim())
      .filter((s) => s.length > 0);
  }
  return [];
}

/**
 * Parse a raw Vexo response into a RecipeBody.
 *
 * Handles known Vexo quirks (verified 2026-06-20):
 * - Sometimes returns wrapped object: `{result: {ingredients, instructions}}`
 * - Sometimes returns flat: `{ingredients, instructions}`
 * - Sometimes markdown-fenced: ```json\n{...}\n```
 * - Sometimes mixed-case keys (Ingredients, recipe_ingredient, etc.)
 * - Sometimes string instead of array (newline-separated)
 *
 * Returns null if the response can't be salvaged — caller should treat
 * null as a failure and not write to DB.
 */
export function parseAndNormalizeBody(raw: string): RecipeBody | null {
  const cleaned = extractJson(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned || "{}");
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  // Unwrap common wrapper keys
  const obj = parsed as Record<string, unknown>;
  const candidate =
    (obj.result as Record<string, unknown> | undefined) ??
    (obj.data as Record<string, unknown> | undefined) ??
    (obj.recipe as Record<string, unknown> | undefined) ??
    obj;

  // Field-name aliases (model may use any of these)
  const rawIngredients =
    candidate.ingredients ??
    candidate.Ingredients ??
    candidate.recipe_ingredients ??
    candidate.recipeIngredients ??
    candidate.bahan;
  const rawInstructions =
    candidate.instructions ??
    candidate.Instructions ??
    candidate.steps ??
    candidate.recipe_instructions ??
    candidate.recipeInstructions ??
    candidate.langkah ??
    candidate.cara;

  const ingredients = normalizeStringArray(rawIngredients);
  const instructions = normalizeStringArray(rawInstructions);

  // Validation — must have at least 3 ingredients and 2 instructions
  // (anything less is clearly truncated/garbage)
  if (ingredients.length < 3) return null;
  if (instructions.length < 2) return null;

  return { ingredients, instructions };
}

/**
 * Final quality check — reject bodies that look low-quality.
 * Cheap heuristic: reject if any ingredient or instruction is too long
 * (>200 chars likely means model pasted recipe prose instead of a list item).
 */
export function looksHealthy(body: RecipeBody): boolean {
  if (body.ingredients.length > 20) return false; // suspiciously long
  if (body.instructions.length > 15) return false;
  for (const item of body.ingredients) {
    if (item.length > 200) return false;
  }
  for (const step of body.instructions) {
    if (step.length > 500) return false;
  }
  return true;
}
