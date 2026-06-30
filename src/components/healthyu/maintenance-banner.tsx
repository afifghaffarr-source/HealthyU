/**
 * MaintenanceBanner — global banner shown when admin sets
 * `maintenance.enabled = true` in app_config. Uses `useAppConfig` hook
 * with a 60s cache. Hidden when flag is false.
 */
import { useAppConfig } from "@/hooks/use-app-config";
import { useTranslation } from "@/lib/i18n";
import { Wrench } from "lucide-react";

export function MaintenanceBanner() {
  const { t } = useTranslation();
  const enabled = useAppConfig<boolean>("maintenance.enabled", false);
  const message = useAppConfig<string>(
    "maintenance.message",
    "Sedang dalam pemeliharaan. Kami akan kembali sebentar lagi.",
  );

  if (!enabled) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-b border-amber-300 dark:border-amber-800 px-4 py-2 flex items-center justify-center gap-2 text-xs sm:text-sm font-medium"
    >
      <Wrench className="size-3.5 shrink-0" />
      <span className="text-center">{message}</span>
    </div>
  );
}
