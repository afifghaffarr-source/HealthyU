/**
 * Nutrition label text parser (Bahasa Indonesia + English).
 *
 * Strategy:
 *   - Tokenize OCR output by lines
 *   - Match each line against pattern rules for known nutrient keys
 *   - Extract numeric value + unit
 *   - Map to canonical field names (calories, protein_g, etc.)
 *
 * Supported fields:
 *   - servingSize  → "Takaran saji 30g" / "Serving size 30g"
 *   - calories     → "Energi: 250 kkal" / "Calories: 250 kcal" / "Energy: 1046 kJ"
 *   - protein_g    → "Protein: 5g"
 *   - carbs_g      → "Karbohidrat: 30g" / "Carbohydrate: 30g" / "Total Carbohydrate"
 *   - sugar_g      → "Gula: 15g" / "Sugars" / "Termasuk gula"
 *   - fat_g        → "Lemak: 10g" / "Total Fat" / "Fat"
 *   - sat_fat_g    → "Lemak jenuh: 3g" / "Saturated Fat"
 *   - trans_fat_g  → "Lemak trans: 0g" / "Trans Fat"
 *   - fiber_g      → "Serat: 3g" / "Dietary Fiber"
 *   - sodium_mg    → "Natrium: 200mg" / "Sodium: 200mg" / "Garam: 0.5g" (converted)
 *   - salt_g       → "Garam: 0.5g" / "Salt"
 *   - cholesterol_mg → "Kolesterol: 10mg" / "Cholesterol"
 *
 * Unit conversions:
 *   - kJ → kcal: divide by 4.184 (common in EU/AU labels)
 *   - Garam → Sodium: × 0.4 (standard conversion)
 *   - mg → g: ÷ 1000 (auto when field unit is g but value in mg)
 *
 * Confidence scoring:
 *   - Each match adds confidence based on pattern specificity
 *   - Returns low confidence if no nutrients found (caller can fallback to AI)
 *
 * @example
 *   const result = parseNutritionLabel(ocrText);
 *   if (result.confidence > 60) submitScan(result.nutrition);
 */

export interface NutritionLabelData {
  servingSize: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  sugar_g: number | null;
  fat_g: number | null;
  sat_fat_g: number | null;
  trans_fat_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
  salt_g: number | null;
  cholesterol_mg: number | null;
}

export interface ParseResult {
  nutrition: NutritionLabelData;
  confidence: number; // 0..100
  matchedFields: number;
  totalFields: number;
}

// Numeric value parser: handles "1,5" (EU), "1.5" (US), "<1", "trace", etc.
function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(",", ".").replace(/[^\d.]/g, "");
  if (!cleaned || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Extract numeric value + unit from a match like "250 kkal" or "10 g"
function extractValueUnit(text: string): { value: number; unit: string } | null {
  // Match: number + unit (unit optional, may be separated by spaces or ":")
  const match = text.match(/([<>]?\s*\d+(?:[.,]\d+)?)\s*(kkal|kcal|kJ|g|mg|kg|mcg|μg)?/i);
  if (!match) return null;
  const value = parseNumber(match[1]);
  if (value === null) return null;
  return { value, unit: (match[2] ?? "").toLowerCase() };
}

// Pattern rule: regex + extractor function returning partial NutritionLabelData
interface Rule {
  keys: RegExp;
  extract: (value: number, unit: string) => Partial<NutritionLabelData>;
  weight: number; // confidence weight (more specific = higher)
}

const KJ_PER_KCAL = 4.184;
const SODIUM_FACTOR_IN_SALT = 0.4;

const RULES: Rule[] = [
  {
    // Serving size (string, not number)
    keys: /\b(takaran\s*saji|serving\s*size|ukuran\s*saji|per\s*serving)\b/i,
    extract: (_v, _u) => ({}), // handled separately as raw text
    weight: 0,
  },
  {
    // Calories / Energi (kkal/kcal/kJ)
    keys: /\b(energi|kalori|kal\.|calories|energy|energie)\b/i,
    extract: (v, u) => ({
      calories: u === "kj" ? Math.round(v / KJ_PER_KCAL) : Math.round(v),
    }),
    weight: 15,
  },
  {
    // Protein
    keys: /\bprotein\b/i,
    extract: (v, u) => ({
      protein_g: u === "mg" ? v / 1000 : v,
    }),
    weight: 10,
  },
  {
    // Karbohidrat total (must precede sugar to avoid "gula" match)
    keys: /\b(karbohidrat|carbohydrate|total\s*carb)\b/i,
    extract: (v, u) => ({
      carbs_g: u === "mg" ? v / 1000 : v,
    }),
    weight: 12,
  },
  {
    // Gula / Sugar (with optional "termasuk" prefix)
    keys: /\b(gula|sugar(?:s)?|termasuk\s*gula|incl\.?\s*sugars?)\b/i,
    extract: (v, u) => ({
      sugar_g: u === "mg" ? v / 1000 : v,
    }),
    weight: 10,
  },
  {
    // Lemak total — common label formats:
    //   ID: "Lemak Total", "Lemak: 10g", "Total Lemak"
    //   US: "Total Fat"
    // Must NOT match "Lemak Jenuh" / "Lemak Trans" / "Saturated Fat" (have own rules).
    keys: /\b(lemak\s*total|lemak\s*[:\d]|total\s*lemak|total\s*fat)\b/i,
    extract: (v, u) => ({
      fat_g: u === "mg" ? v / 1000 : v,
    }),
    weight: 12,
  },
  {
    // Lemak jenuh / Saturated fat
    keys: /\b(lemak\s*jenuh|saturated\s*fat|sat\.?\s*fat)\b/i,
    extract: (v, u) => ({
      sat_fat_g: u === "mg" ? v / 1000 : v,
    }),
    weight: 8,
  },
  {
    // Lemak trans / Trans fat
    keys: /\b(lemak\s*trans|trans\s*fat)\b/i,
    extract: (v, u) => ({
      trans_fat_g: u === "mg" ? v / 1000 : v,
    }),
    weight: 6,
  },
  {
    // Serat / Fiber
    keys: /\b(serat|fiber|fibre|dietary\s*fiber)\b/i,
    extract: (v, u) => ({
      fiber_g: u === "mg" ? v / 1000 : v,
    }),
    weight: 8,
  },
  {
    // Natrium / Sodium (in mg)
    keys: /\b(natrium|sodium)\b/i,
    extract: (v) => ({ sodium_mg: Math.round(v) }),
    weight: 10,
  },
  {
    // Garam / Salt (in g → convert to sodium_mg)
    keys: /\b(garam|salt)\b/i,
    extract: (v, u) => {
      const grams = u === "mg" ? v / 1000 : v;
      return {
        salt_g: grams,
        sodium_mg: Math.round(grams * 1000 * SODIUM_FACTOR_IN_SALT),
      };
    },
    weight: 8,
  },
  {
    // Kolesterol / Cholesterol (in mg)
    keys: /\b(kolesterol|cholesterol)\b/i,
    extract: (v) => ({ cholesterol_mg: Math.round(v) }),
    weight: 6,
  },
];

const TOTAL_FIELDS = 12;

export function parseNutritionLabel(rawText: string): ParseResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const nutrition: NutritionLabelData = {
    servingSize: null,
    calories: null,
    protein_g: null,
    carbs_g: null,
    sugar_g: null,
    fat_g: null,
    sat_fat_g: null,
    trans_fat_g: null,
    fiber_g: null,
    sodium_mg: null,
    salt_g: null,
    cholesterol_mg: null,
  };

  let confidence = 0;
  let matchedFields = 0;
  let servingSizeCaptured = false;

  for (const line of lines) {
    // Serving size: capture raw text after the key, no numeric extraction
    if (!servingSizeCaptured) {
      const servingMatch = line.match(
        /(?:takaran\s*saji|serving\s*size|ukuran\s*saji|per\s*serving)\s*[:-]?\s*(.+)/i,
      );
      if (servingMatch) {
        nutrition.servingSize = servingMatch[1].trim().slice(0, 80);
        servingSizeCaptured = true;
        continue;
      }
    }

    // Apply each rule to find the matching nutrient
    for (const rule of RULES) {
      if (!rule.keys.test(line)) continue;

      // Skip rules that have no extract (serving size handled above)
      if (rule.weight === 0) continue;

      const extracted = extractValueUnit(line);
      if (!extracted) continue;

      // Don't override already-matched fields (first match wins)
      const partial = rule.extract(extracted.value, extracted.unit);
      let addedNew = false;
      for (const [key, val] of Object.entries(partial)) {
        const k = key as keyof NutritionLabelData;
        if (nutrition[k] === null) {
          (nutrition[k] as number | null) = val as number;
          addedNew = true;
        }
      }
      if (addedNew) {
        matchedFields += 1;
        confidence += rule.weight;
      }
      break; // one rule per line max
    }
  }

  // Cap confidence at 100
  confidence = Math.min(100, confidence);

  return {
    nutrition,
    confidence,
    matchedFields,
    totalFields: TOTAL_FIELDS,
  };
}
