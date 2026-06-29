import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  weeklyReport,
  weeklyAiAnalysis,
  listAiReports,
} from "@/features/reports/lib/reports.functions";
import { BottomNav } from "@/components/bottom-nav";
import { Download, FileText, Sparkles, Loader2, Share2 } from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast-config";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/i18n";
import { useAnnounce } from "@/components/live-announcer.hook";
import { exportWeeklyCsv, exportWeeklyPdf } from "@/features/reports/lib/reportsPdf";
import { Stat } from "@/features/reports/components/Stat";
import { WeeklyChart } from "@/features/reports/components/WeeklyChart";
import { AiReportHistorySection } from "@/features/reports/components/AiReportHistorySection";
import { shareWeeklyToWhatsapp } from "@/features/reports/lib/shareWhatsapp";
import { buildWeeklySummary } from "@/features/reports/lib/reportsSummary";
import {
  useLastSeenReportId,
  useMarkReportSeen,
  useAiReportsRealtime,
} from "@/features/reports/hooks/useReportsRealtime";

export const Route = createFileRoute("/_authenticated/reports")({
  validateSearch: zodValidator(
    z.object({ focus: fallback(z.enum(["latest"]).optional(), undefined) }),
  ),
  component: ReportsPage,
});

function ReportsPage() {
  const { focus } = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const announce = useAnnounce();
  useEffect(() => {
    if (focus !== "latest") return;
    const timer = setTimeout(() => {
      navigate({ to: "/reports", search: {}, replace: true });
    }, 3000);
    return () => clearTimeout(timer);
  }, [focus, navigate]);
  const fetchFn = useServerFn(weeklyReport);
  const aiFn = useServerFn(weeklyAiAnalysis);
  const listFn = useServerFn(listAiReports);
  const qc = useQueryClient();
  const [rangeWeeks, setRangeWeeks] = useState<number>(0); // 0 = semua
  const [manualFlashId, setManualFlashId] = useState<string | null>(null);
  const manualGenAtRef = useAiReportsRealtime();
  const { data } = useQuery({
    queryKey: ["report", 7],
    queryFn: () => fetchFn({ data: { days: 7 } }),
  });
  const { data: history = [] } = useQuery({
    queryKey: ["ai-reports"],
    queryFn: () => listFn(),
  });
  const { data: lastSeenId = null } = useLastSeenReportId();
  const latestId = history[0]?.id ?? null;
  useMarkReportSeen(focus, latestId, lastSeenId);
  const aiMut = useMutation({
    mutationFn: () => {
      manualGenAtRef.current = Date.now();
      return aiFn({ data: { days: 7 } });
    },
    onSuccess: async () => {
      const res = await qc.invalidateQueries({ queryKey: ["ai-reports"] });
      void res;
      // Mark latest report id (after refetch) for a 3s visual flash
      const latest = qc.getQueryData<Array<{ id: string }>>(["ai-reports"])?.[0]?.id ?? null;
      if (latest) {
        setManualFlashId(latest);
        const row = qc.getQueryData<
          Array<{
            id: string;
            report_period_start?: string | null;
            report_period_end?: string | null;
          }>
        >(["ai-reports"])?.[0];
        const periode =
          row?.report_period_start && row?.report_period_end
            ? `${row.report_period_start} → ${row.report_period_end}`
            : t("reports.latest");
        announce(t("reports.announceGenerated", { periode }));
        window.setTimeout(() => setManualFlashId((cur) => (cur === latest ? null : cur)), 3000);
      }
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : t("reports.generateError");
      toast.error(msg);
      announce(t("reports.announceGenerateError", { msg }), "assertive");
    },
  });

  const summary = useMemo(() => buildWeeklySummary(data), [data]);

  const shareWhatsapp = (override?: { text: string; periodStart?: string; periodEnd?: string }) =>
    shareWeeklyToWhatsapp({
      summary,
      aiReport: aiMut.data?.report ?? null,
      override,
    });

  const maxCal = Math.max(1, ...(summary?.byDay.map((d) => d.cals) ?? [1]));

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar
          title={t("reports.title")}
          subtitle={t("reports.subtitle")}
          showBack
          className="print:hidden"
        />

        <section className="grid grid-cols-2 gap-3 animate-fade-up">
          <Stat
            label={t("reports.stat.totalCalIn")}
            value={`${Math.round(summary?.totals.cals ?? 0)}`}
            sub={t("reports.unit.kcal")}
          />
          <Stat
            label={t("reports.stat.burn")}
            value={`${summary?.totals.burn ?? 0}`}
            sub={t("reports.unit.kcal")}
          />
          <Stat
            label={t("reports.stat.totalWater")}
            value={`${((summary?.totals.ml ?? 0) / 1000).toFixed(1)}`}
            sub={t("reports.unit.liter")}
          />
          <Stat
            label={t("reports.stat.totalSleep")}
            value={`${(summary?.totals.hours ?? 0).toFixed(1)}`}
            sub={t("reports.unit.hours")}
          />
          <Stat
            label={t("reports.stat.workout")}
            value={`${summary?.workoutCount ?? 0}`}
            sub={t("workout.sessionUnit")}
          />
          <Stat
            label={t("reports.stat.fastingDone")}
            value={`${summary?.fastingDone ?? 0}`}
            sub={t("workout.sessionUnit")}
          />
        </section>

        {summary && <WeeklyChart byDay={summary.byDay} maxCal={maxCal} />}

        <section className="grid grid-cols-3 gap-2 print:hidden">
          <button
            onClick={() => data && exportWeeklyCsv(data)}
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-2xl"
          >
            <Download className="size-4" /> <span className="text-sm">CSV</span>
          </button>
          <button
            onClick={() => summary && exportWeeklyPdf(summary, aiMut.data?.report, t)}
            className="flex items-center justify-center gap-2 bg-card outline-1 outline-black/10 font-semibold py-3 rounded-2xl"
          >
            <FileText className="size-4" /> <span className="text-sm">PDF</span>
          </button>
          <button
            onClick={() => shareWhatsapp()}
            className="flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold py-3 rounded-2xl"
          >
            <Share2 className="size-4" /> <span className="text-sm">WA</span>
          </button>
        </section>

        <section className="space-y-3 animate-fade-up">
          <button
            onClick={() => aiMut.mutate()}
            disabled={aiMut.isPending}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold py-3 rounded-2xl shadow-lg disabled:opacity-60"
          >
            {aiMut.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {aiMut.isPending ? t("reports.generating") : t("reports.weekly.title")}
          </button>
          {aiMut.data && (
            <article className="bg-card p-5 rounded-3xl outline-1 outline-black/5 text-sm leading-relaxed whitespace-pre-wrap">
              {aiMut.data.report}
            </article>
          )}
        </section>

        {history.length > 0 && (
          <AiReportHistorySection
            history={history}
            rangeWeeks={rangeWeeks}
            setRangeWeeks={setRangeWeeks}
            latestId={latestId}
            lastSeenId={lastSeenId}
            manualFlashId={manualFlashId}
            focusLatest={focus === "latest"}
            t={t}
            onShare={(args) => shareWhatsapp(args)}
          />
        )}
      </div>
      <BottomNav />
    </main>
  );
}
