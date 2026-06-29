import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/calendar/google")({ component: Page });

function Page() {
  const { t } = useTranslation();
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title={t("googleCalendar.title")} showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm mb-3">{t("googleCalendar.syncHint")}</p>
          <button
            onClick={() => window.alert(t("googleCalendar.oauthConfig"))}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm"
          >
            {t("googleCalendar.connect")}
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
