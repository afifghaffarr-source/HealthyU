/**
 * FeatureDisabled — full-page gate shown when a feature flag is off.
 * Used by route components to short-circuit rendering when admin has
 * disabled a feature via the app_config admin page.
 *
 * Uses `useFeatureFlag(flagKey)` — which calls readPublicConfig under the
 * hood, cached for 60s.
 */
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useFeatureFlag, type FeatureFlagKey } from "@/hooks/use-app-config";
import { useTranslation } from "@/lib/i18n";
import { Ban, Home } from "lucide-react";

export function FeatureDisabled({
  flag,
  titleKey,
  descKey,
  defaultValue = true,
  children,
}: {
  flag: FeatureFlagKey;
  titleKey: Parameters<ReturnType<typeof useTranslation>["t"]>[0];
  descKey: Parameters<ReturnType<typeof useTranslation>["t"]>[0];
  defaultValue?: boolean;
  children: ReactNode;
}) {
  const enabled = useFeatureFlag(flag, defaultValue);
  const { t } = useTranslation();
  if (enabled) return <>{children}</>;

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-12 space-y-5 text-center">
        <div className="size-16 rounded-full bg-destructive/10 text-destructive mx-auto flex items-center justify-center">
          <Ban className="size-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold">{t(titleKey)}</h1>
          <p className="text-sm text-muted-foreground">{t(descKey)}</p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold"
        >
          <Home className="size-4" />
          {t("common.featDisabledBack")}
        </Link>
      </div>
    </main>
  );
}
