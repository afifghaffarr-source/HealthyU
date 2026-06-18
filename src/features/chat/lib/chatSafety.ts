/**
 * Chatbot safety guard (Indonesian + English keywords).
 * - Detects self-harm / crisis intent -> respond with crisis resources, skip AI.
 * - Detects requests for diagnosis / prescription / dosing -> append medical disclaimer.
 * - Detects requests for dangerous behavior (extreme fasting <500kcal, purging, etc).
 */

export type SafetyResult =
  | { kind: "safe" }
  | { kind: "crisis"; response: string }
  | { kind: "disclaimer"; response: string }
  | { kind: "disclaimer-ed"; response: string; category: "ed_disclosure" }
  | { kind: "blocked"; response: string };

const CRISIS = [
  // Indonesian
  "bunuh diri",
  "ingin mati",
  "mau mati",
  "pengen mati", // AUDIT-012 Finding 3 (2026-06-16 follow-up): colloquial for "ingin mati"
  "mau ngilang", // often pre-crisis; "want to disappear"
  "cape hidup", // "tired of life" — colloquial; conservative trigger
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

const DIAGNOSIS = [
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

const PRESCRIPTION = [
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

// AUDIT-012 Finding 4 (2026-06-16): eating-disorder disclosures get a more
// specific response with ED-aware resources. Auto-escalating ED → crisis is
// a clinical decision deferred to next quarterly review — this list only
// detects ED, the response is informational (not crisis escalation).
const ED_DISCLOSURE = [
  "anoreksia",
  "bulimia",
  "eating disorder",
  "binge eating",
  "binge-eating",
  "purging",
  "restrictive eating",
  "gangguan makan",
];

const MEDICAL_CONDITIONS = [
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

const DANGEROUS = [
  "puasa ekstrim",
  "tidak makan seminggu",
  "tidak makan 7 hari",
  "muntah setelah makan",
  "memuntahkan makanan",
  "starve myself",
  "purge after eating",
  "extreme fasting",
];

const CRISIS_REPLY =
  "Saya sangat peduli dengan keselamatan kamu. Apa yang kamu rasakan terdengar berat, dan kamu tidak sendiri.\n\n" +
  "**Hubungi sekarang (24 jam, gratis):**\n" +
  "- **Into The Light Indonesia**: https://www.intothelightid.org/\n" +
  "- **Kemenkes Sehat Jiwa**: 119 ext 8\n" +
  "- **Yayasan Pulih**: (021) 78842580\n" +
  "- Jika dalam bahaya segera, datang ke IGD rumah sakit terdekat.\n\n" +
  "Aku di sini untuk dengar. Mau cerita apa yang sedang terjadi?";

const DISCLAIMER =
  "\n\n> ⚕️ Saya bukan pengganti dokter. Untuk diagnosis, dosis obat, atau keputusan medis, konsultasikan dengan tenaga kesehatan berlisensi.";

const BLOCKED_DANGEROUS =
  "Maaf, aku tidak bisa membantu dengan praktik yang berbahaya bagi tubuhmu. " +
  "Kalau kamu sedang berjuang dengan pola makan atau berat badan, bicara dengan ahli gizi atau psikolog adalah langkah aman. " +
  "Mau aku bantu cari layanan terdekat?";

// ED-specific disclaimer: same crisis hotlines as CRISIS_REPLY (verified in
// the project) + guidance to seek ED-specialist professional help. Phone
// numbers from the existing CRISIS_REPLY are NOT re-listed unverified —
// AUDIT-012 Finding 1 flagged that those need quarterly human verification.
const ED_DISCLOSURE_REPLY =
  "\n\n> 🍽️ Saya bukan pengganti tenaga kesehatan. Kalau kamu berjuang dengan " +
  "pola makan, berat badan, atau citra tubuh, bantuan profesional bisa sangat " +
  "berbeda hasilnya — terutama dari ahli yang berpengalaman dalam gangguan makan.\n\n" +
  "**Langkah yang bisa membantu:**\n" +
  "- Bicara dengan **psikolog** atau **ahli gizi** yang berpengalaman dengan gangguan makan\n" +
  "- Hubungi **Yayasan Pulih** (021) 78842580 — mereka punya program dukungan gangguan makan\n" +
  "- **Into The Light Indonesia**: https://www.intothelightid.org/ — dukungan kesehatan jiwa\n" +
  "- **Kemenkes Sehat Jiwa**: 119 ext 8 (24 jam)\n\n" +
  "Kamu tidak sendirian. Mau cerita lebih banyak?";

function contains(text: string, list: string[]): boolean {
  const t = text.toLowerCase();
  return list.some((k) => t.includes(k));
}

export function checkChatSafety(message: string): SafetyResult {
  if (!message) return { kind: "safe" };
  if (contains(message, CRISIS)) {
    return { kind: "crisis", response: CRISIS_REPLY };
  }
  if (contains(message, DANGEROUS)) {
    return { kind: "blocked", response: BLOCKED_DANGEROUS };
  }
  // ED disclosure: more specific than the generic disclaimer path. Check
  // BEFORE MEDICAL_CONDITIONS so ED keywords (anoreksia, etc.) get the
  // richer ED-specific resources rather than the generic doctor disclaimer.
  if (contains(message, ED_DISCLOSURE)) {
    return { kind: "disclaimer-ed", response: ED_DISCLOSURE_REPLY, category: "ed_disclosure" };
  }
  if (
    contains(message, DIAGNOSIS) ||
    contains(message, PRESCRIPTION) ||
    contains(message, MEDICAL_CONDITIONS)
  ) {
    return { kind: "disclaimer", response: DISCLAIMER };
  }
  return { kind: "safe" };
}
