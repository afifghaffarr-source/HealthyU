import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { gachaPull } from "@/features/scan/lib/scanBatch7.functions";
import { Gift } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/gacha")({ component: Page });

function Page() {
  const fn = useServerFn(gachaPull);
  const { t } = useTranslation();
  const [last, setLast] = useState<string | null>(null);
  const mut = useMutation({
    mutationFn: () => fn({ data: undefined as never }),
    onSuccess: (r) => {
      setLast(r.reward.label);
      toast.success(r.reward.label);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const spinning = mut.isPending;
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title={t("gacha.title")} showBack />
      <main className="max-w-md mx-auto px-4 pt-8 text-center space-y-6">
        <div className="relative size-44 mx-auto">
          <div
            className={`absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#16a34a,#0ea5e9,#f59e0b,#ec4899,#a855f7,#16a34a)] ${spinning ? "animate-spin" : ""}`}
            style={{ animationDuration: spinning ? "0.6s" : undefined }}
          />
          <div className="absolute inset-2 rounded-full bg-card grid place-items-center text-6xl">
            🎁
          </div>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-primary" />
        </div>
        <h2 className="text-2xl font-bold">{t("gacha.spin")}</h2>
        <p className="text-sm text-muted-foreground">{t("gacha.costHint")}</p>
        <button
          onClick={() => mut.mutate()}
          disabled={spinning}
          className="rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground px-8 py-3 font-semibold inline-flex items-center gap-2 shadow-lg shadow-primary/30 disabled:opacity-60"
        >
          <Gift className="size-5" /> {spinning ? t("gacha.spinning") : t("gacha.pullBtn")}
        </button>
        {last && !spinning && (
          <p className="text-lg font-bold text-primary animate-fade-up">
            {t("gacha.result", { label: last })}
          </p>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
