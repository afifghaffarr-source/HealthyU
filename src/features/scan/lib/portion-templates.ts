/**
 * Sprint W2: AI Warung Mode — Portion Templates
 *
 * Pre-defined portion combinations for common Indonesian meal patterns.
 * Used by AI to suggest realistic portion sizes for detected food combos.
 *
 * Ref: docs/features/ai-warung-mode-spec.md (PR #27 v3)
 */

export type PortionTemplate = {
  id: string;
  label: string; // "Paket Nasi + Lauk + Sayur"
  items: Array<{
    canonical_name: string; // matches food_items.name
    portion_g: number; // suggested portion in grams
    portion_label: string; // "1 piring", "1 potong", etc.
  }>;
  total_est_calories: number;
  tags: string[]; // ["warteg", "lunch", "affordable"]
};

/**
 * Standard warteg/warung portion templates.
 * Based on typical Indonesian eating patterns + TKPI portion guidelines.
 */
export const PORTION_TEMPLATES: PortionTemplate[] = [
  // ========================================
  // Warteg Standard (most common)
  // ========================================
  {
    id: "warteg-standard",
    label: "Paket Warteg Standar",
    items: [
      { canonical_name: "Nasi Putih", portion_g: 150, portion_label: "1 piring" },
      { canonical_name: "Ayam Goreng", portion_g: 80, portion_label: "1 potong" },
      { canonical_name: "Tempe Goreng", portion_g: 50, portion_label: "1 potong" },
      { canonical_name: "Sayur Asem", portion_g: 100, portion_label: "1 centong" },
      { canonical_name: "Sambal", portion_g: 15, portion_label: "1 sendok makan" },
    ],
    total_est_calories: 650,
    tags: ["warteg", "lunch", "affordable"],
  },

  {
    id: "warteg-vegetarian",
    label: "Paket Warteg Vegetarian",
    items: [
      { canonical_name: "Nasi Putih", portion_g: 150, portion_label: "1 piring" },
      { canonical_name: "Tempe Goreng", portion_g: 80, portion_label: "2 potong" },
      { canonical_name: "Tahu Goreng", portion_g: 80, portion_label: "2 potong" },
      { canonical_name: "Tumis Kangkung", portion_g: 100, portion_label: "1 porsi" },
      { canonical_name: "Sambal", portion_g: 15, portion_label: "1 sendok makan" },
    ],
    total_est_calories: 520,
    tags: ["warteg", "vegetarian", "affordable"],
  },

  {
    id: "warteg-ikan",
    label: "Paket Warteg Ikan",
    items: [
      { canonical_name: "Nasi Putih", portion_g: 150, portion_label: "1 piring" },
      { canonical_name: "Ikan Goreng", portion_g: 80, portion_label: "1 potong" },
      { canonical_name: "Tahu Goreng", portion_g: 50, portion_label: "1 potong" },
      { canonical_name: "Sayur Sop", portion_g: 100, portion_label: "1 centong" },
      { canonical_name: "Sambal", portion_g: 15, portion_label: "1 sendok makan" },
    ],
    total_est_calories: 580,
    tags: ["warteg", "fish", "lunch"],
  },

  // ========================================
  // Padang Restaurant
  // ========================================
  {
    id: "padang-standard",
    label: "Paket Padang Standar",
    items: [
      { canonical_name: "Nasi Putih", portion_g: 200, portion_label: "1 piring besar" },
      { canonical_name: "Rendang Sapi", portion_g: 100, portion_label: "1 potong" },
      { canonical_name: "Gulai Ayam", portion_g: 100, portion_label: "1 potong" },
      { canonical_name: "Perkedel", portion_g: 70, portion_label: "1 buah" },
      { canonical_name: "Sambal Ijo", portion_g: 20, portion_label: "1 sendok makan" },
    ],
    total_est_calories: 920,
    tags: ["padang", "lunch", "dinner"],
  },

  {
    id: "padang-light",
    label: "Paket Padang Ringan",
    items: [
      { canonical_name: "Nasi Putih", portion_g: 150, portion_label: "1 piring" },
      { canonical_name: "Ayam Pop", portion_g: 100, portion_label: "1 potong" },
      { canonical_name: "Sayur Lodeh", portion_g: 100, portion_label: "1 centong" },
      { canonical_name: "Sambal Ijo", portion_g: 15, portion_label: "1 sendok makan" },
    ],
    total_est_calories: 580,
    tags: ["padang", "lunch", "lighter"],
  },

  // ========================================
  // Street Food / Snack
  // ========================================
  {
    id: "gorengan-combo",
    label: "Paket Gorengan",
    items: [
      { canonical_name: "Tempe Mendoan", portion_g: 80, portion_label: "2 potong" },
      { canonical_name: "Bakwan", portion_g: 70, portion_label: "1 buah" },
      { canonical_name: "Pisang Goreng", portion_g: 75, portion_label: "1 potong" },
      { canonical_name: "Teh Tawar", portion_g: 250, portion_label: "1 gelas" },
    ],
    total_est_calories: 565,
    tags: ["snack", "street-food", "afternoon"],
  },

  // ========================================
  // Breakfast
  // ========================================
  {
    id: "breakfast-simple",
    label: "Sarapan Sederhana",
    items: [
      { canonical_name: "Nasi Uduk", portion_g: 150, portion_label: "1 piring" },
      { canonical_name: "Telur Dadar", portion_g: 60, portion_label: "1 potong" },
      { canonical_name: "Tempe Goreng", portion_g: 50, portion_label: "1 potong" },
      { canonical_name: "Sambal", portion_g: 10, portion_label: "1 sendok teh" },
    ],
    total_est_calories: 480,
    tags: ["breakfast", "simple"],
  },

  // ========================================
  // Noodle / Soup
  // ========================================
  {
    id: "mie-ayam-combo",
    label: "Paket Mie Ayam",
    items: [
      { canonical_name: "Mie Ayam", portion_g: 300, portion_label: "1 mangkok" },
      { canonical_name: "Pangsit Goreng", portion_g: 60, portion_label: "5 buah" },
      { canonical_name: "Es Teh Manis", portion_g: 250, portion_label: "1 gelas" },
    ],
    total_est_calories: 620,
    tags: ["lunch", "noodles", "affordable"],
  },

  {
    id: "bakso-combo",
    label: "Paket Bakso",
    items: [
      { canonical_name: "Bakso", portion_g: 350, portion_label: "1 mangkok" },
      { canonical_name: "Tahu Goreng", portion_g: 50, portion_label: "2 potong" },
      { canonical_name: "Es Teh Manis", portion_g: 250, portion_label: "1 gelas" },
    ],
    total_est_calories: 520,
    tags: ["lunch", "soup", "affordable"],
  },

  // ========================================
  // Nasi Goreng / Fried Rice
  // ========================================
  {
    id: "nasgor-combo",
    label: "Paket Nasi Goreng",
    items: [
      { canonical_name: "Nasi Goreng", portion_g: 250, portion_label: "1 piring" },
      { canonical_name: "Telur Ceplok", portion_g: 50, portion_label: "1 butir" },
      { canonical_name: "Kerupuk", portion_g: 20, portion_label: "5 keping" },
    ],
    total_est_calories: 680,
    tags: ["dinner", "fried-rice", "popular"],
  },
];

/**
 * Match detected items against portion templates.
 * Returns best-matching template if ≥2 items match, null otherwise.
 *
 * @param detectedItems - Array of food names detected by AI
 * @returns Matching template or null
 */
export function matchPortionTemplate(detectedItems: string[]): PortionTemplate | null {
  if (detectedItems.length < 2) return null;

  const normalizedDetected = detectedItems.map((name) => name.toLowerCase().trim());

  let bestMatch: { template: PortionTemplate; score: number } | null = null;

  for (const template of PORTION_TEMPLATES) {
    const templateItems = template.items.map((item) => item.canonical_name.toLowerCase());

    // Count how many template items are present in detected items
    let matchCount = 0;
    for (const templateItem of templateItems) {
      if (normalizedDetected.some((d) => d.includes(templateItem) || templateItem.includes(d))) {
        matchCount++;
      }
    }

    // Score = (matches / template_size) + (matches / detected_size)
    // Weighted average to handle partial matches
    const score = matchCount / templateItems.length + matchCount / normalizedDetected.length;

    if (matchCount >= 2 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { template, score };
    }
  }

  // Require at least 40% match confidence
  return bestMatch && bestMatch.score >= 0.4 ? bestMatch.template : null;
}

/**
 * Get suggested portion for a specific food item from matched template.
 * Returns null if item not in template.
 */
export function getSuggestedPortion(
  template: PortionTemplate | null,
  foodName: string,
): { portion_g: number; portion_label: string } | null {
  if (!template) return null;

  const normalized = foodName.toLowerCase().trim();
  const match = template.items.find(
    (item) =>
      item.canonical_name.toLowerCase().includes(normalized) ||
      normalized.includes(item.canonical_name.toLowerCase()),
  );

  return match ? { portion_g: match.portion_g, portion_label: match.portion_label } : null;
}
