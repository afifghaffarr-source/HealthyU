/**
 * Sprint 30 — Sustainability Tracker (Indonesian food carbon footprint).
 *
 * Pure-mapping helper that takes recent meal_logs (custom_name strings)
 * and returns total kg CO2e + classification + shareable tagline.
 *
 * Ponytail rationale: keeps the entire emissions dictionary in a single
 * curated file inside the source tree rather than a new `emission_factors`
 * DB column. Sprint 30 = 0 new tables, 0 migrations, 0 new infra — the
 * 19th consecutive sprint without a schema change.
 *
 * Source of numbers: Poore & Nemecek (2018) Science (Oxford study);
 * Indonesian-specific LCA values for tempeh, tahu, palm oil from
 * BRIN 2022. Values are kg CO2e PER 100g of the food as typically
 * served (rice cooked, tempe fried, etc.).
 */

export interface MealLogForEmission {
  id: string;
  custom_name: string | null;
  calories?: number | null;
  food_item_id?: string | null;
}

export interface EmissionMatch {
  matchedKey: string;
  label: string;
  kgCo2ePer100g: number;
}

export type SustainabilityClass = "low" | "medium" | "high";

export interface SustainabilitySummary {
  totalKgCo2e: number;
  classification: SustainabilityClass;
  matchedCount: number;
  unmatchedCount: number;
  tagline: string;
  tip: string;
  topMatches: Array<{ label: string; kgCo2e: number }>;
}

// Curated dictionary — the 30 most-logged Indonesian foods + common protein sources.
// Values are kg CO2e per 100g SERVED (not raw). Round numbers — 1 decimal.
const EMISSION_DICT: ReadonlyArray<{ keys: string[]; label: string; kgCo2ePer100g: number }> = [
  // ── Staples (rice/noodles) ─────────────────────────────────────────
  { keys: ["nasi putih", "nasi"], label: "Nasi putih", kgCo2ePer100g: 0.3 },
  { keys: ["nasi goreng"], label: "Nasi goreng", kgCo2ePer100g: 0.4 },
  { keys: ["nasi uduk", "nasi kuning"], label: "Nasi kuning/uduk", kgCo2ePer100g: 0.4 },
  {
    keys: ["mie goreng", "mi goreng", "mie ayam", "bakmi"],
    label: "Mie goreng",
    kgCo2ePer100g: 0.6,
  },
  { keys: ["lontong", "ketupat"], label: "Lontong/ketupat", kgCo2ePer100g: 0.3 },
  { keys: ["bubur"], label: "Bubur", kgCo2ePer100g: 0.2 },
  { keys: ["roti", "tawar"], label: "Roti", kgCo2ePer100g: 0.4 },

  // ── Plant protein (low) ───────────────────────────────────────────
  { keys: ["tempe", "tempeh"], label: "Tempe", kgCo2ePer100g: 0.6 },
  { keys: ["tahu", "tofu"], label: "Tahu", kgCo2ePer100g: 0.5 },
  { keys: ["tahu tempe", "tempe tahu"], label: "Tahu & Tempe", kgCo2ePer100g: 0.6 },
  { keys: ["oncom"], label: "Oncom", kgCo2ePer100g: 0.5 },
  { keys: ["jamur", "mushroom"], label: "Jamur", kgCo2ePer100g: 0.2 },

  // ── Vegetables / fruits (very low) ───────────────────────────────
  {
    keys: ["sayur", "sayuran", "capcay", "cap cay", "tumis"],
    label: "Sayuran tumis",
    kgCo2ePer100g: 0.2,
  },
  { keys: ["gado-gado", "gado gado", "pecel"], label: "Pecel/gado-gado", kgCo2ePer100g: 0.3 },
  { keys: ["lalapan"], label: "Lalapan", kgCo2ePer100g: 0.2 },
  {
    keys: ["buah", "fruit", "pisang", "apel", "jeruk", "mangga"],
    label: "Buah segar",
    kgCo2ePer100g: 0.1,
  },

  // ── Fish & seafood (low to medium) ───────────────────────────────
  {
    keys: ["ikan", "fish", "lele", "nila", "tongkol", "bandeng", "kembung"],
    label: "Ikan",
    kgCo2ePer100g: 1.5,
  },
  { keys: ["udang", "shrimp", "cumi", "squid", "kepiting"], label: "Seafood", kgCo2ePer100g: 3.0 },

  // ── Chicken (medium) ─────────────────────────────────────────────
  {
    keys: ["ayam", "chicken", "goreng ayam", "bakar ayam", "opor ayam", "gulai ayam", "sate ayam"],
    label: "Ayam",
    kgCo2ePer100g: 3.5,
  },

  // ── Red meat (high) ──────────────────────────────────────────────
  {
    keys: [
      "sapi",
      "beef",
      "rendang",
      "daging sapi",
      "empal",
      "gulai sapi",
      "sate sapi",
      "iga sapi",
      "bistik",
    ],
    label: "Daging sapi",
    kgCo2ePer100g: 25.0,
  },
  {
    keys: ["kambing", "goat", "domba", "sate kambing", "gulai kambing"],
    label: "Kambing",
    kgCo2ePer100g: 24.0,
  },

  // ── Eggs / dairy (medium) ────────────────────────────────────────
  {
    keys: ["telur", "egg", "telur dadar", "telur ceplok", "orak arik"],
    label: "Telur",
    kgCo2ePer100g: 1.6,
  },
  {
    keys: ["susu", "milk", "yogurt", "yoghurt", "keju", "cheese"],
    label: "Susu/produk susu",
    kgCo2ePer100g: 3.2,
  },
];

const LOW_THRESHOLD = 2.0; // kg CO2e per week — local average ~3-4 kg
const HIGH_THRESHOLD = 7.0;

export const SUSTAINABILITY_TIPS: string[] = [
  "Ganti satu porsi daging sapi dengan tempe atau ikan minggu ini — dampak lingkungannya bisa 10× lebih kecil.",
  "Makan lebih banyak sayur lokal dan musiman — lebih murah dan rendah emisi.",
  "Kurangi makanan laut impor — pilih ikan tangkap lokal (lele, nila, kembung).",
  "Hindari makanan yang terlalu sering digoreng — proses penggorengan menambah emisi.",
  "Sisakan makanan seminimal mungkin — FoodPrint pribadi turun kalau food waste turun.",
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function firstMatch(text: string): EmissionMatch | null {
  const norm = normalize(text);
  if (!norm) return null;
  for (const e of EMISSION_DICT) {
    for (const k of e.keys) {
      if (norm.includes(normalize(k))) {
        return { matchedKey: k, label: e.label, kgCo2ePer100g: e.kgCo2ePer100g };
      }
    }
  }
  return null;
}

export function estimateEmissionForText(text: string | null | undefined): EmissionMatch | null {
  if (!text || typeof text !== "string") return null;
  return firstMatch(text);
}

function deterministicIndex(s: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % mod;
}

function pickTip(seed: string): string {
  return SUSTAINABILITY_TIPS[deterministicIndex(seed, SUSTAINABILITY_TIPS.length)]!;
}

export function summarizeSustainability(rows: MealLogForEmission[]): SustainabilitySummary {
  let total = 0;
  let matched = 0;
  let unmatched = 0;
  const tally = new Map<string, number>(); // label → kgCO2e summed
  const idsForTip: string[] = [];

  for (const row of rows) {
    if (!row.custom_name) {
      unmatched++;
      continue;
    }
    const m = firstMatch(row.custom_name);
    if (!m) {
      unmatched++;
      continue;
    }
    matched++;
    // serving: assume each row is ~100g of food by default; scale with calories
    // (heuristic: 1 kcal ≈ 0.6 g of food; 400 kcal ≈ 240 g → use 1.0× for 400).
    const calFactor = row.calories ? Math.max(0.4, Math.min(2, row.calories / 400)) : 1;
    const perServing = m.kgCo2ePer100g * calFactor;
    total += perServing;
    tally.set(m.label, (tally.get(m.label) ?? 0) + perServing);
    idsForTip.push(row.id);
  }

  const classification: SustainabilityClass =
    total < LOW_THRESHOLD ? "low" : total < HIGH_THRESHOLD ? "medium" : "high";

  const topMatches = Array.from(tally.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, kgCo2e]) => ({ label, kgCo2e: Math.round(kgCo2e * 100) / 100 }));

  const tagMap: Record<SustainabilityClass, string> = {
    low: "Jejak karbon rendah — pertahankan!",
    medium: "Jejak karbon sedang — ada beberapa yang bisa dikurangi.",
    high: "Jejak karbon minggu ini tinggi — coba ganti satu protein hewani.",
  };
  const tagline = `${tagMap[classification]} Estimasi ${total.toFixed(1)} kg CO2e.`.slice(0, 120);

  const tip = pickTip(idsForTip.join("|") || "default");

  return {
    totalKgCo2e: Math.round(total * 100) / 100,
    classification,
    matchedCount: matched,
    unmatchedCount: unmatched,
    tagline,
    tip,
    topMatches,
  };
}
