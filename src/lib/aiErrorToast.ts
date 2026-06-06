import { toast } from "sonner";

/**
 * Map AI gateway / serverFn errors to friendly Indonesian toasts.
 * Recognises rate-limit (429), credit habis (402), busy/timeout (503/504),
 * and falls back to the raw message for everything else.
 *
 * AiGatewayError messages from the server are already Indonesian, so we
 * mostly just pick the right toast severity (warning vs error vs info).
 */
export function toastAiError(err: unknown, fallback = "Terjadi kesalahan AI"): void {
  const msg = err instanceof Error ? err.message : String(err ?? fallback);
  const lower = msg.toLowerCase();

  // Rate limit
  if (lower.includes("batas ai") || lower.includes("rate-limit") || lower.includes("429")) {
    toast.warning(msg.includes("Batas") ? msg : "Batas AI tercapai. Coba lagi sebentar.", {
      description: "Progress kecil tetap progress — istirahat sebentar ya.",
    });
    return;
  }
  // Credit / payment
  if (lower.includes("kredit ai") || lower.includes("402")) {
    toast.error("Kredit AI sedang habis", {
      description: "Tim kami sudah diberi tahu. Coba lagi nanti.",
    });
    return;
  }
  // Busy / timeout
  if (
    lower.includes("timeout") ||
    lower.includes("sibuk") ||
    lower.includes("503") ||
    lower.includes("504")
  ) {
    toast.error("Layanan AI sedang sibuk", {
      description: "Coba lagi sebentar lagi.",
    });
    return;
  }
  toast.error(msg || fallback);
}