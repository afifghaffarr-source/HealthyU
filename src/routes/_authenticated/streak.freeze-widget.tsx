import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/streak/freeze-widget")({ component: Page });

function Page() {
  const { t } = useTranslation();
  const [used, setUsed] = useState(false);
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title={t("streakFreeze.title")} showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <div className="rounded-2xl border bg-card p-6 text-center space-y-3">
          <div className="text-6xl">🧊</div>
          <p className="text-sm">{t("streakFreeze.desc")}</p>
          <button
            onClick={() => setUsed(true)}
            disabled={used}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm"
          >
            {used ? t("streakFreeze.used") : t("streakFreeze.useBtn")}
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
