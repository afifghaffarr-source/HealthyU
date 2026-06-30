/**
 * Service worker update toast — Sprint 1a vite-plugin-pwa integration.
 *
 * Memakai useRegisterSW dari virtual:pwa-register/react (auto-generated oleh
 * vite-plugin-pwa). Hanya muncul saat SW baru tersedia dari server.
 *
 * UX:
 * - Saat ada update → tampilkan toast kecil di bawah dengan 2 tombol:
 *   - "Muat ulang" → panggil updateServiceWorker(true) → reload halaman
 *   - "Nanti" → dismiss (toast hilang, update akan apply pada kunjungan berikut)
 *
 * Kenapa tidak auto-apply (skipWaiting=true)?
 * - skipWaiting=false di vite.config.ts → user punya kontrol.
 * - Mencegah kehilangan state form / unsaved input saat auto-reload.
 *
 * Disabled di dev (vite-plugin-pwa devOptions.enabled=false) dan di SSR.
 */

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const DISMISS_KEY = "healthyu-sw-update-dismissed";

interface RegisterSWOptions {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegisteredSW?: (
    swScriptUrl: string,
    registration: ServiceWorkerRegistration | undefined,
  ) => void;
  onRegisterError?: (error: unknown) => void;
}

export function SWUpdateToast() {
  const { t } = useTranslation();
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateFn, setUpdateFn] = useState<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Skip on dev — vite-plugin-pwa devOptions.enabled=false means no /sw.js served.
    if (import.meta.env.DEV) return;

    let cancelled = false;
    (async () => {
      try {
        // virtual:pwa-register/react is provided by vite-plugin-pwa at dev/build time.
        const mod = await import("virtual:pwa-register/react");
        if (cancelled) return;
        const opts: RegisterSWOptions = {
          immediate: true,
          onNeedRefresh: () => setNeedRefresh(true),
          onOfflineReady: () => setOfflineReady(true),
          onRegisteredSW: (_url, _reg) => {
            // SW registered — could surface telemetry here.
          },
          onRegisterError: (error) => {
            // Non-fatal — surface to errorReporting.ts in future.
            // Sprint 40 exemption: service worker lifecycle — no PII surface,
            // boot/bootstrap scenario where structured logging adds no value.
            console.warn("[SW] register error:", error);
          },
        };
        const { updateServiceWorker } = mod.useRegisterSW(opts);
        setUpdateFn(() => updateServiceWorker);
      } catch (err) {
        // Virtual module not available (e.g. SW disabled or build without PWA plugin).
        // Silent fail — InstallPrompt + offline fallback still work without it.
        // Sprint 40 exemption: service worker bootstrap — no PII surface,
        // boot scenario where structured logging adds no value.
        console.warn("[SW] useRegisterSW not available:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!needRefresh && !offlineReady) return null;

  const handleUpdate = async () => {
    if (!updateFn) return;
    localStorage.removeItem(DISMISS_KEY);
    await updateFn(true); // true = reload after update
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setNeedRefresh(false);
    setOfflineReady(false);
  };

  return (
    <div
      data-testid="sw-update-toast"
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-4 z-50 pointer-events-none flex justify-center px-4"
    >
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-xl p-3 flex items-center gap-2 animate-fade-up pointer-events-auto">
        <div className="size-9 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
          <RefreshCw className="size-4" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">
            {needRefresh ? t("pwa.updateAvailable") : t("pwa.offlineReady")}
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight">
            {needRefresh ? t("pwa.updateDesc") : t("pwa.offlineDesc")}
          </p>
        </div>
        {needRefresh && (
          <button
            type="button"
            onClick={handleUpdate}
            className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg"
          >
            {t("pwa.reload")}
          </button>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("common.close")}
          className="size-7 grid place-items-center text-muted-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
