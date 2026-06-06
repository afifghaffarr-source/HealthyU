import { toast as sonnerToast } from "sonner";

const defaults = { duration: 2500 } as const;

export const toast = Object.assign(
  (message: string, opts?: Parameters<typeof sonnerToast>[1]) =>
    sonnerToast(message, { ...defaults, ...opts }),
  {
    success: (m: string, o?: Parameters<typeof sonnerToast.success>[1]) =>
      sonnerToast.success(m, { ...defaults, ...o }),
    error: (m: string, o?: Parameters<typeof sonnerToast.error>[1]) =>
      sonnerToast.error(m, { ...defaults, ...o, duration: 3500 }),
    info: (m: string, o?: Parameters<typeof sonnerToast.info>[1]) =>
      sonnerToast.info(m, { ...defaults, ...o }),
    warning: (m: string, o?: Parameters<typeof sonnerToast.warning>[1]) =>
      sonnerToast.warning(m, { ...defaults, ...o }),
    loading: sonnerToast.loading,
    dismiss: sonnerToast.dismiss,
    promise: sonnerToast.promise,
  },
);

/**
 * Helper untuk menampilkan error toast dari nilai unknown (mis. error mutasi).
 * Menggantikan pola berulang `toast.error(e instanceof Error ? e.message : "Gagal")`.
 *
 * Mendeteksi pola error AI gateway (429 / 402 / 503 / 504 / timeout) dan
 * memetakan ke severity + microcopy ramah pengguna. Untuk non-AI error,
 * tampilkan pesan asli (atau fallback) sebagai toast.error standar.
 */
export function toastError(e: unknown, fallback = "Gagal"): void {
  const msg = e instanceof Error ? e.message : typeof e === "string" ? e : fallback;
  const final = msg || fallback;
  const lower = final.toLowerCase();

  // Rate limit (AI gateway 429)
  if (
    lower.includes("batas ai") ||
    lower.includes("rate-limit") ||
    lower.includes("terlalu banyak") ||
    lower.includes(" 429")
  ) {
    sonnerToast.warning(final, {
      description: "Progress kecil tetap progress — istirahat sebentar ya.",
      duration: 4000,
    });
    return;
  }
  // Credit habis (402)
  if (lower.includes("kredit ai") || lower.includes(" 402")) {
    sonnerToast.error("Kredit AI sedang habis", {
      description: "Tim kami sudah diberi tahu. Coba lagi nanti.",
      duration: 4500,
    });
    return;
  }
  // Busy / timeout (503 / 504)
  if (
    lower.includes("timeout") ||
    lower.includes("sedang sibuk") ||
    lower.includes(" 503") ||
    lower.includes(" 504")
  ) {
    sonnerToast.error("Layanan AI sedang sibuk", {
      description: "Coba lagi sebentar lagi.",
      duration: 4000,
    });
    return;
  }
  sonnerToast.error(final, { duration: 3500 });
}
