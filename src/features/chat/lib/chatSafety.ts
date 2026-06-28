/**
 * Chatbot safety guard (Indonesian + English keywords).
 * - Detects self-harm / crisis intent -> respond with crisis resources, skip AI.
 * - Detects requests for diagnosis / prescription / dosing -> append medical disclaimer.
 * - Detects requests for dangerous behavior (extreme fasting <500kcal, purging, etc).
 *
 * Sprint 25 additions (engineering layer only — clinical response changes
 * DEFERRED to psychologist/nutritionist sign-off per AUDIT-012 Finding 4):
 * - `auditEdDisclosure(message)` fires a meta-only telemetry event when an
 *   ED disclosure is detected. No raw text leaves the function — only the
 *   category, the ED keyword count, a length bucket, and a has-purge flag.
 *   See `edDisclosureTelemetry.test.ts` for the contract.
 * - Crisis resources are now imported from `medicalSafety.CRISIS_RESOURCES`
 *   to keep the verified phone list in one place. Adding a new phone number
 *   without human verification is reject by the resource-pointer test.
 */

import { CRISIS_RESOURCES } from "@/features/safety/lib/medicalSafety";

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

// Sprint 25: build crisis reply from CRISIS_RESOURCES allowlist. This is
// the single-source-of-truth so a verified-number update flows to every
// caller that uses checkChatSafety(). The resource-pointer test asserts
// chatSafety.ts does NOT hardcode phone/URL strings outside this builder.
function buildCrisisReply(): string {
  const head =
    "Saya sangat peduli dengan keselamatan kamu. Apa yang kamu rasakan " +
    "terdengar berat, dan kamu tidak sendiri.\n\n" +
    "**Hubungi sekarang (24 jam, gratis):**\n";
  const lines = CRISIS_RESOURCES.id.map((r) => {
    if ("phone" in r && r.phone) return `- **${r.name}**: ${r.phone}`;
    if ("url" in r && r.url) return `- **${r.name}**: ${r.url}`;
    return `- **${r.name}**`;
  });
  const tail = "\nAku di sini untuk dengar. Mau cerita apa yang sedang terjadi?";
  return head + lines.join("\n") + "\n\n" + tail;
}
const CRISIS_REPLY = buildCrisisReply();

const DISCLAIMER =
  "\n\n> ⚕️ Saya bukan pengganti dokter. Untuk diagnosis, dosis obat, atau keputusan medis, konsultasikan dengan tenaga kesehatan berlisensi.";

const BLOCKED_DANGEROUS =
  "Maaf, aku tidak bisa membantu dengan praktik yang berbahaya bagi tubuhmu. " +
  "Kalau kamu sedang berjuang dengan pola makan atau berat badan, bicara dengan ahli gizi atau psikolog adalah langkah aman. " +
  "Mau aku bantu cari layanan terdekat?";

// ED-specific disclaimer. Crisis hotlines + Yayasan Pulih's ED program
// reference (verified) + Into The Light mental-health support. Phone numbers
// come from CRISIS_RESOURCES so quarterly human verification has a single
// edit point.
function buildEdDisclosureReply(): string {
  const intro =
    "\n\n> 🍽️ Saya bukan pengganti tenaga kesehatan. Kalau kamu berjuang " +
    "dengan pola makan, berat badan, atau citra tubuh, bantuan profesional " +
    "bisa sangat berbeda hasilnya — terutama dari ahli yang berpengalaman " +
    "dengan gangguan makan.\n\n" +
    "**Langkah yang bisa membantu:**\n" +
    "- Bicara dengan **psikolog** atau **ahli gizi** yang berpengalaman dengan gangguan makan\n";
  const references = CRISIS_RESOURCES.id
    .filter((r) => {
      // Drop 'IGD rumah sakit terdekat' — no phone/URL, generic routing.
      const phone = "phone" in r ? r.phone : undefined;
      const url = "url" in r ? r.url : undefined;
      return Boolean(phone || url);
    })
    .map((r) => {
      const note = r.note ? ` — ${r.note.toLowerCase()}` : "";
      if ("phone" in r && r.phone) return `- **${r.name}**: ${r.phone}${note}`;
      if ("url" in r && r.url) return `- **${r.name}**: ${r.url}${note}`;
      return `- **${r.name}**`;
    });
  const tail = "\nKamu tidak sendirian. Mau cerita lebih banyak?";
  return intro + references.join("\n") + "\n\n" + tail;
}
// `ED_DISCLOSURE_REPLY` is exported so the resource-pointer test can
// assert the Yayasan Pulih program reference surfaces in the rendered
// reply. Do not hardcode phone/URL strings outside CRISIS_RESOURCES.
export const ED_DISCLOSURE_REPLY = buildEdDisclosureReply();

function contains(text: string, list: string[]): boolean {
  const t = text.toLowerCase();
  return list.some((k) => t.includes(k));
}

// Purge-language signals for the ED-disclosure audit. Conservative:
// matches the exact columns we ask the user to keep clean. False
// positives acceptable here — flagged at high urgency path on dashboard
// for follow-up review, no clinical response generated until psychologist
// signs off.
const PURGE_LANGUAGE = [
  "muntah",
  "memuntahkan",
  "muntahkan makanan",
  "purge",
  "purging",
  "laxative",
  "laksatif",
  "diuretic",
  "diuretik",
];

function lengthBucket(len: number): "short" | "medium" | "long" {
  if (len <= 80) return "short";
  if (len <= 240) return "medium";
  return "long";
}

/**
 * Sprint 25 — derive metadata for the ED-disclosure audit log.
 * Returns null when no ED disclosure is detected. Otherwise returns the
 * meta fields to attach to the existing `log_audit_event(_action =
 * 'chat.safety.ed_disclosure')` server-side audit. The caller is the only
 * responsible party for actually flushing the event (e.g. `chat.stream.ts`
 * posts to `audit_log` via RPC). This helper does NOT log telemetry by
 * itself — fire-and-forget from the chat stream is the canonical path,
 * and duplicating the event client-side would skew our prevalence data.
 *
 * Privacy: no message text leaves this function. Only length bucket,
 * keyword count, and a co-occurring purge-language boolean.
 *
 * Clinical-response changes (e.g. adding depression-specific copy or
 * changing the ED reply text) are DEFERRED to psychologist sign-off —
 * see AUDIT-012 Finding 4.
 */
export type EdDisclosureMeta = {
  category: "ed_disclosure";
  keyword_count: number;
  length_bucket: "short" | "medium" | "long";
  has_purge_language: boolean;
  message_length: number;
};

export function buildEdMeta(message: string): EdDisclosureMeta | null {
  if (!message) return null;
  const t = message.toLowerCase();
  const keywordCount = ED_DISCLOSURE.filter((k) => t.includes(k)).length;
  if (keywordCount === 0) return null;
  const hasPurgeLanguage = PURGE_LANGUAGE.some((k) => t.includes(k));
  return {
    category: "ed_disclosure",
    keyword_count: keywordCount,
    length_bucket: lengthBucket(message.length),
    has_purge_language: hasPurgeLanguage,
    message_length: message.length,
  };
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
