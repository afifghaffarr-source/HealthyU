/**
 * Medical Safety — generic, AI-surface-agnostic.
 *
 * Why this module exists:
 * - chatSafety.ts handles chatbot-specific keywords (free-form user chat).
 * - Other AI surfaces (coach, OCR nutrition label, warung mode, meal plan
 *   AI swap, workout AI substitute) ALSO touch medical content — either
 *   because user-typed text might include health terms, or because the AI
 *   output could imply medical advice.
 * - We want a SINGLE source of truth for:
 *   1. Keyword detection (engineering-only — clinical escalation is
 *      explicitly out of scope per project policy).
 *   2. Disclaimer copy (Indonesian, conservative).
 *   3. Verified crisis resources (re-used from chatSafety; do NOT add new
 *      phone numbers without human verification — see AUDIT-012 Finding 1).
 *
 * Design constraints:
 * - PII-safe by construction: telemetry payload NEVER includes user message
 *   text — only counts and category ids.
 * - No new clinical responses. When a user discloses an eating disorder, we
 *   point to existing resources, but the actual *clinical escalation* is
 *   deferred to psychologist/nutritionist review (per project memory
 *   "Clinical vs engineering safety (2026-06-17)").
 * - Pure functions: no I/O. Telemetry is reported via `reportSafetyEvent`
 *   separately so this module stays testable.
 */

export type SafetyLevel =
  | "safe"
  | "disclaimer" // user mentioned diagnosis/prescription/condition → append disclaimer
  | "ed" // eating-disorder disclosure → ED-aware resources
  | "crisis" // self-harm / suicidal intent → crisis hotlines, skip AI
  | "dangerous"; // extreme fasting / purging → block, suggest help

export type SafetyCategory =
  | "diagnosis"
  | "prescription"
  | "medical_condition"
  | "eating_disorder"
  | "crisis"
  | "dangerous_behavior";

export type SafetyCheckResult = {
  level: SafetyLevel;
  /** First matched category, useful for telemetry bucketing. */
  category?: SafetyCategory;
  /** True if user-input was the trigger (false if keyword matched in AI output). */
  triggeredByUserInput: boolean;
};

// ─── Keyword lists ─────────────────────────────────────────────────────────
// AUDIT-012 (2026-06-16) keyword sets — re-used here so all AI surfaces use
// the same detector. New keyword additions require sign-off (see AGENTS.md).

const CRISIS_KEYWORDS = [
  // Indonesian
  "bunuh diri",
  "ingin mati",
  "mau mati",
  "pengen mati",
  "mau ngilang",
  "cape hidup",
  "akhiri hidup",
  "mengakhiri hidup",
  "menyakiti diri",
  "melukai diri",
  "potong nadi",
  "overdosis",
  // English
  "kill myself",
  "suicide",
  "end my life",
  "self harm",
  "self-harm",
  "cut myself",
  "hang myself",
];

const DIAGNOSIS_KEYWORDS = [
  "saya sakit apa",
  "diagnosa saya",
  "diagnosis saya",
  "apakah saya kanker",
  "apakah saya diabetes",
  "apakah saya hamil",
  "apakah saya hipertensi",
  "apakah saya pcos",
  "apakah saya anemia",
  "kenapa saya sakit",
  "penyakit saya apa",
  "do i have",
  "diagnose me",
  "am i sick with",
  "is this cancer",
  "is this diabetes",
];

const PRESCRIPTION_KEYWORDS = [
  "berapa dosis",
  "dosis obat",
  "resep obat",
  "obat apa untuk",
  "minum obat apa",
  "obat penurun",
  "obat pengencer",
  "antibiotik untuk",
  "insulin dosis",
  "metformin",
  "what dose",
  "prescribe",
  "prescription for",
  "which drug",
  "what medication",
];

const MEDICAL_CONDITION_KEYWORDS = [
  // Pregnancy & reproductive
  "saya hamil",
  "sedang hamil",
  "menyusui",
  "asi eksklusif",
  "promil",
  // Chronic conditions where nutrition advice needs a doctor
  "diabetes tipe 1",
  "diabetes tipe 2",
  "gula darah tinggi",
  "hipertensi",
  "tekanan darah tinggi",
  "gagal ginjal",
  "penyakit ginjal",
  "cuci darah",
  "kolesterol tinggi",
  "penyakit jantung",
  "gagal jantung",
  "asam urat tinggi",
  "kanker",
  "kemoterapi",
  "hipotiroid",
  "hipertiroid",
  "celiac",
  "ibd",
  "crohn",
  // English
  "pregnant",
  "breastfeeding",
  "kidney disease",
  "heart failure",
  "thyroid",
];

// Eating-disorder disclosure. Auto-escalating ED → crisis is a clinical
// decision deferred to next quarterly review — this list only DETECTS ED,
// the response is informational (resources, not crisis escalation).
const ED_KEYWORDS = [
  "anoreksia",
  "bulimia",
  "eating disorder",
  "binge eating",
  "binge-eating",
  "purging",
  "restrictive eating",
  "gangguan makan",
];

const DANGEROUS_KEYWORDS = [
  "puasa ekstrim",
  "tidak makan seminggu",
  "tidak makan 7 hari",
  "muntah setelah makan",
  "memuntahkan makanan",
  "starve myself",
  "purge after eating",
  "extreme fasting",
];

const KEYWORD_GROUPS: Array<{
  category: SafetyCategory;
  keywords: string[];
}> = [
  { category: "crisis", keywords: CRISIS_KEYWORDS },
  { category: "dangerous_behavior", keywords: DANGEROUS_KEYWORDS },
  { category: "eating_disorder", keywords: ED_KEYWORDS },
  { category: "diagnosis", keywords: DIAGNOSIS_KEYWORDS },
  { category: "prescription", keywords: PRESCRIPTION_KEYWORDS },
  { category: "medical_condition", keywords: MEDICAL_CONDITION_KEYWORDS },
];

function containsAny(text: string, keywords: string[]): boolean {
  const t = text.toLowerCase();
  return keywords.some((k) => t.includes(k.toLowerCase()));
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Detect medical safety concerns in a piece of text (user input or AI
 * output). Pure function — no I/O. Returns the highest-priority match.
 *
 * Order of priority:
 *   crisis > dangerous_behavior > eating_disorder > diagnosis >
 *   prescription > medical_condition > safe
 */
export function detectMedicalContext(
  text: string,
  options: { triggeredByUserInput?: boolean } = {},
): SafetyCheckResult {
  if (!text || text.trim().length === 0) {
    return { level: "safe", triggeredByUserInput: true };
  }
  for (const { category, keywords } of KEYWORD_GROUPS) {
    if (containsAny(text, keywords)) {
      const level = mapCategoryToLevel(category);
      return {
        level,
        category,
        // Default to true: most callers pass user input. AI-output scanning
        // should pass triggeredByUserInput=false explicitly.
        triggeredByUserInput: options.triggeredByUserInput ?? true,
      };
    }
  }
  return { level: "safe", triggeredByUserInput: true };
}

function mapCategoryToLevel(category: SafetyCategory): SafetyLevel {
  switch (category) {
    case "crisis":
      return "crisis";
    case "dangerous_behavior":
      return "dangerous";
    case "eating_disorder":
      return "ed";
    case "diagnosis":
    case "prescription":
    case "medical_condition":
      return "disclaimer";
  }
}

// ─── Disclaimer copy (re-used across all AI surfaces) ─────────────────────
// Phone numbers and resources are verified existing numbers from
// src/features/chat/lib/chatSafety.ts (CRISIS_REPLY). Do NOT add new phone
// numbers without human verification.

export const MEDICAL_DISCLAIMER_ID =
  "\n\n> ⚕️ Saya bukan pengganti dokter. Untuk diagnosis, dosis obat, atau keputusan medis, konsultasikan dengan tenaga kesehatan berlisensi.";

export const MEDICAL_DISCLAIMER_EN =
  "\n\n> ⚕️ I'm not a substitute for a doctor. For diagnosis, medication dosage, or medical decisions, please consult a licensed healthcare professional.";

export const MEDICAL_DISCLAIMER_DEFAULT = MEDICAL_DISCLAIMER_ID;

export const CRISIS_RESOURCES = {
  id: [
    {
      name: "Into The Light Indonesia",
      url: "https://www.intothelightid.org/",
      note: "Dukungan kesehatan jiwa",
    },
    {
      name: "Kemenkes Sehat Jiwa",
      phone: "119 ext 8",
      note: "24 jam, gratis",
    },
    {
      name: "Yayasan Pulih",
      phone: "(021) 78842580",
      note: "Konseling trauma & gangguan makan",
    },
    {
      name: "IGD rumah sakit terdekat",
      note: "Jika dalam bahaya segera",
    },
  ],
};

export const CRISIS_RESPONSE_ID =
  "Saya sangat peduli dengan keselamatan kamu. Apa yang kamu rasakan terdengar berat, dan kamu tidak sendiri.\n\n" +
  "**Hubungi sekarang (24 jam, gratis):**\n" +
  "- **Into The Light Indonesia**: https://www.intothelightid.org/\n" +
  "- **Kemenkes Sehat Jiwa**: 119 ext 8\n" +
  "- **Yayasan Pulih**: (021) 78842580\n" +
  "- Jika dalam bahaya segera, datang ke IGD rumah sakit terdekat.\n\n" +
  "Aku di sini untuk dengar. Mau cerita apa yang sedang terjadi?";

export const DANGEROUS_RESPONSE_ID =
  "Maaf, aku tidak bisa membantu dengan praktik yang berbahaya bagi tubuhmu. " +
  "Kalau kamu sedang berjuang dengan pola makan atau berat badan, bicara dengan ahli gizi atau psikolog adalah langkah aman. " +
  "Mau aku bantu cari layanan terdekat?";

export const ED_RESPONSE_ID =
  "\n\n> 🍽️ Saya bukan pengganti tenaga kesehatan. Kalau kamu berjuang dengan " +
  "pola makan, berat badan, atau citra tubuh, bantuan profesional bisa sangat " +
  "berbeda hasilnya — terutama dari ahli yang berpengalaman dalam gangguan makan.\n\n" +
  "**Langkah yang bisa membantu:**\n" +
  "- Bicara dengan **psikolog** atau **ahli gizi** yang berpengalaman dengan gangguan makan\n" +
  "- Hubungi **Yayasan Pulih** (021) 78842580 — mereka punya program dukungan gangguan makan\n" +
  "- **Into The Light Indonesia**: https://www.intothelightid.org/ — dukungan kesehatan jiwa\n" +
  "- **Kemenkes Sehat Jiwa**: 119 ext 8 (24 jam)\n\n" +
  "Kamu tidak sendirian. Mau cerita lebih banyak?";

// ─── AI system prompt guard ───────────────────────────────────────────────
// Appended to ALL AI prompts via `wrapAiSystemPrompt()`. Anti-diagnosis and
// anti-prescription instruction is critical for liability — keeps the model
// from drifting into clinical advice even when user input is borderline.

export const AI_ANTI_DIAGNOSIS_GUARD = `
[ATURAN WAJIB — HEALTHYU MEDICAL SAFETY GUARD]
1. Kamu BUKAN tenaga kesehatan. Jangan pernah memberikan diagnosis, meresepkan obat, atau menentukan dosis.
2. Jika user menanyakan kemungkinan penyakit, arahkan ke dokter/tenaga medis berlisensi.
3. Jika user menyebutkan kondisi medis (hamil, diabetes, jantung, ginjal, dll), berikan saran umum dan tambahkan disclaimer.
4. Jika user menunjukkan tanda krisis (bunuh diri, menyakiti diri), JANGAN jawab dengan saran — langsung tampilkan hotline krisis: Into The Light (https://www.intothelightid.org/), Kemenkes Sehat Jiwa 119 ext 8, Yayasan Pulih (021) 78842580.
5. Saran diet & latihan bersifat umum — bukan pengganti konsultasi ahli gizi, dokter, atau pelatih bersertifikat.
6. Selalu gunakan disclaimer "Saran umum, bukan saran medis" untuk rekomendasi yang menyentuh kondisi kesehatan.
`;

/**
 * Wrap an AI system prompt with the medical safety guard.
 * Idempotent: if the guard is already present, it won't be appended twice.
 */
export function wrapAiSystemPrompt(systemPrompt: string): string {
  if (systemPrompt.includes("HEALTHYU MEDICAL SAFETY GUARD")) {
    return systemPrompt;
  }
  return `${AI_ANTI_DIAGNOSIS_GUARD}\n${systemPrompt}`;
}
