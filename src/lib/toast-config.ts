/**
 * Toast wrapper.
 *
 * Backend: `react-hot-toast` (SSR-safe, no module-singleton store,
 * no hydration-mismatch issues).
 *
 * We re-export a Sonner-shaped API (`toast.success/error/...`, `toastError`)
 * so all 100+ call-sites keep working unchanged.
 *
 * Note: Sonner supported a `description` field on each toast;
 * `react-hot-toast` does not. We compose `title\n\ndescription` into the
 * primary message for the few places that need a two-line message
 * (AI-gateway error variants in `toastError` below).
 */
import toastLib, { type ToastOptions, type Renderable } from "react-hot-toast";

const DEFAULT_DURATION = 2500;
const ERROR_DURATION = 3500;

function withDefaults(
  options: ToastOptions | undefined,
  overrides: ToastOptions = {},
): ToastOptions {
  return { duration: DEFAULT_DURATION, ...options, ...overrides };
}

export const toast = Object.assign(
  (message: Renderable, options?: ToastOptions) => toastLib(message, withDefaults(options)),
  {
    success: (message: Renderable, options?: ToastOptions) =>
      toastLib.success(message, withDefaults(options)),
    error: (message: Renderable, options?: ToastOptions) =>
      toastLib.error(message, withDefaults(options, { duration: ERROR_DURATION })),
    info: (message: Renderable, options?: ToastOptions) => toastLib(message, withDefaults(options)),
    warning: (message: Renderable, options?: ToastOptions) =>
      toastLib(message, withDefaults(options)),
    loading: (message: Renderable, options?: ToastOptions) =>
      toastLib.loading(message, withDefaults(options)),
    dismiss: (id?: string) => toastLib.dismiss(id),
    promise: <T>(
      promise: Promise<T> | (() => Promise<T>),
      msgs: {
        loading: Renderable;
        success: Renderable | ((value: T) => Renderable);
        error: Renderable | ((err: unknown) => Renderable);
      },
      options?: ToastOptions,
    ): Promise<T> => toastLib.promise(promise, msgs, withDefaults(options)),
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
    toastLib(
      `${final}\nProgress kecil tetap progress — istirahat sebentar ya.`,
      withDefaults(undefined, { duration: 4000 }),
    );
    return;
  }
  // Credit habis (402)
  if (lower.includes("kredit ai") || lower.includes(" 402")) {
    toastLib.error(
      "Kredit AI sedang habis\nTim kami sudah diberi tahu. Coba lagi nanti.",
      withDefaults(undefined, { duration: 4500 }),
    );
    return;
  }
  // Busy / timeout (503 / 504)
  if (
    lower.includes("timeout") ||
    lower.includes("sedang sibuk") ||
    lower.includes(" 503") ||
    lower.includes(" 504")
  ) {
    toastLib.error(
      "Layanan AI sedang sibuk\nCoba lagi sebentar lagi.",
      withDefaults(undefined, { duration: 4000 }),
    );
    return;
  }
  toastLib.error(final, withDefaults(undefined, { duration: ERROR_DURATION }));
}
