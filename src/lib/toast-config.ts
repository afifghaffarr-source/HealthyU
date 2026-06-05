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
 */
export function toastError(e: unknown, fallback = "Gagal"): void {
  const msg =
    e instanceof Error
      ? e.message
      : typeof e === "string"
        ? e
        : fallback;
  sonnerToast.error(msg || fallback, { duration: 3500 });
}
