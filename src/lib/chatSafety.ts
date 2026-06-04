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
  | { kind: "blocked"; response: string };

const CRISIS = [
  // Indonesian
  "bunuh diri", "ingin mati", "mau mati", "akhiri hidup", "mengakhiri hidup",
  "menyakiti diri", "melukai diri", "potong nadi", "overdosis",
  // English
  "kill myself", "suicide", "end my life", "self harm", "self-harm",
  "cut myself", "hang myself",
];

const DIAGNOSIS = [
  "saya sakit apa", "diagnosa saya", "diagnosis saya", "apakah saya kanker",
  "apakah saya diabetes", "apakah saya hamil",
  "do i have", "diagnose me", "am i sick with",
];

const PRESCRIPTION = [
  "berapa dosis", "dosis obat", "resep obat", "obat apa untuk",
  "what dose", "prescribe", "prescription for",
];

const DANGEROUS = [
  "puasa ekstrim", "tidak makan seminggu", "tidak makan 7 hari",
  "muntah setelah makan", "memuntahkan makanan",
  "starve myself", "purge after eating", "extreme fasting",
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
  if (contains(message, DIAGNOSIS) || contains(message, PRESCRIPTION)) {
    return { kind: "disclaimer", response: DISCLAIMER };
  }
  return { kind: "safe" };
}