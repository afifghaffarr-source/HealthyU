import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { weeklyReport, weeklyAiAnalysis, listAiReports } from "@/features/reports/lib/reports.functions";
import { BottomNav } from "@/components/bottom-nav";
import { Download, FileText, Sparkles, Loader2, Share2 } from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/i18n";
import { useAnnounce } from "@/components/live-announcer";
import { exportWeeklyCsv, exportWeeklyPdf } from "@/features/reports/lib/reportsPdf";
import { Stat } from "@/features/reports/components/Stat";
import { WeeklyChart } from "@/features/reports/components/WeeklyChart";
import { AiReportHistorySection } from "@/features/reports/components/AiReportHistorySection";

export const Route = createFileRoute("/_authenticated/reports")({
  validateSearch: zodValidator(
    z.object({ focus: fallback(z.enum(["latest"]).optional(), undefined) }),
  ),
  component: ReportsPage,
});

function dayKey(d: string | Date) {
  return new Date(d).toISOString().slice(0, 10);
}

function ReportsPage() {
  const { focus } = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const announce = useAnnounce();
  useEffect(() => {
    if (focus !== "latest") return;
    const t = setTimeout(() => {
      navigate({ to: "/reports", search: {}, replace: true });
    }, 3000);
    return () => clearTimeout(t);
  }, [focus, navigate]);
  const fetchFn = useServerFn(weeklyReport);
  const aiFn = useServerFn(weeklyAiAnalysis);
  const listFn = useServerFn(listAiReports);
  const qc = useQueryClient();
  const [rangeWeeks, setRangeWeeks] = useState<number>(0); // 0 = semua
  const manualGenAtRef = useRef<number>(0);
  const [manualFlashId, setManualFlashId] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["report", 7],
    queryFn: () => fetchFn({ data: { days: 7 } }),
  });
  const { data: history = [] } = useQuery({
    queryKey: ["ai-reports"],
    queryFn: () => listFn(),
  });
  const { data: lastSeenId = null } = useQuery({
    queryKey: ["profile-last-seen-report"],
    queryFn: async (): Promise<string | null> => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return null;
      const { data: prof } = await supabase
        .from("profiles")
        .select("last_seen_report_id")
        .eq("id", uid)
        .maybeSingle();
      return (prof as { last_seen_report_id?: string | null } | null)?.last_seen_report_id ?? null;
    },
  });
  const latestId = history[0]?.id ?? null;
  useEffect(() => {
    if (!latestId || lastSeenId === latestId) return;
    if (focus !== "latest") return;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      await supabase
        .from("profiles")
        .update({ last_seen_report_id: latestId } as never)
        .eq("id", uid);
      qc.invalidateQueries({ queryKey: ["profile-last-seen-report"] });
    })();
  }, [focus, latestId, lastSeenId, qc]);

  // Realtime: refresh history when a new ai_reports row is inserted
  useEffect(() => {
    const ch = supabase
      .channel("ai-reports-archive")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_reports" }, () => {
        // Local-only: clear last-seen so the new row gets the "Baru" badge
        // immediately without waiting for the user to open it.
        qc.setQueryData(["profile-last-seen-report"], null);
        qc.invalidateQueries({ queryKey: ["ai-reports"] });
        // Suppress when the INSERT was caused by the user's own manual
        // generation (toast would duplicate aiMut's result).
        if (Date.now() - manualGenAtRef.current > 10000) {
          toast.success("📄 Laporan minggu baru tersedia");
        }
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [qc]);
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
            : "terbaru";
        announce(`Laporan ${periode} baru di-generate`);
        window.setTimeout(() => setManualFlashId((cur) => (cur === latest ? null : cur)), 3000);
      }
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Gagal generate";
      toast.error(msg);
      announce(`Gagal generate laporan: ${msg}`, "assertive");
    },
  });

  const summary = useMemo(() => {
    if (!data) return null;
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    const byDay = days.map((day) => {
      const cals = data.meals
        .filter((m) => dayKey(m.logged_at) === day)
        .reduce((s, m) => s + Number(m.calories || 0), 0);
      const ml = data.water
        .filter((w) => dayKey(w.logged_at) === day)
        .reduce((s, w) => s + (w.amount_ml || 0), 0);
      const burn = data.workouts
        .filter((w) => dayKey(w.performed_at) === day)
        .reduce((s, w) => s + (w.calories_burned || 0), 0);
      const slept = data.sleep.filter((s) => dayKey(s.sleep_end) === day);
      const hours = slept.reduce(
        (s, x) =>
          s + (new Date(x.sleep_end).getTime() - new Date(x.sleep_start).getTime()) / 3600000,
        0,
      );
      return { day, cals, ml, burn, hours };
    });
    const totals = byDay.reduce(
      (a, b) => ({
        cals: a.cals + b.cals,
        ml: a.ml + b.ml,
        burn: a.burn + b.burn,
        hours: a.hours + b.hours,
      }),
      { cals: 0, ml: 0, burn: 0, hours: 0 },
    );
    const fastingDone = data.fasting.filter((f) => f.completed).length;
    return {
      byDay,
      totals,
      fastingDone,
      workoutCount: data.workouts.length,
      sleepCount: data.sleep.length,
    };
  }, [data]);




  const shareWhatsapp = (overrideReport?: {
    text: string;
    periodStart?: string;
    periodEnd?: string;
  }) => {
    if (!summary && !overrideReport) return;
    const header = overrideReport
      ? `📊 *Laporan HealthyU* ${overrideReport.periodStart ?? ""} → ${overrideReport.periodEnd ?? ""}`.trim()
      : "📊 *Laporan HealthyU 7 Hari*";
    const body = overrideReport?.text ?? aiMut.data?.report;
    if (overrideReport) {
      const text = [
        header,
        "",
        body ? `_${body.slice(0, 600)}${body.length > 600 ? "…" : ""}_` : "",
        "— dikirim dari HealthyU",
      ]
        .filter(Boolean)
        .join("\n");
      window.open(
        `https://wa.me/?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }
    const lines = [
      "📊 *Laporan HealthyU 7 Hari*",
      "",
      `🍽️ Total kalori masuk: ${Math.round(summary!.totals.cals)} kcal`,
      `🔥 Kalori terbakar: ${summary!.totals.burn} kcal`,
      `💧 Total air: ${(summary!.totals.ml / 1000).toFixed(1)} L`,
      `😴 Total tidur: ${summary!.totals.hours.toFixed(1)} jam`,
      `🏃 Latihan: ${summary!.workoutCount} sesi`,
      `⏱️ Puasa selesai: ${summary!.fastingDone} sesi`,
      "",
      aiMut.data?.report
        ? `_${aiMut.data.report.slice(0, 400)}${aiMut.data.report.length > 400 ? "…" : ""}_`
        : "",
      "— dikirim dari HealthyU",
    ]
      .filter(Boolean)
      .join("\n");
    const url = `https://wa.me/?text=${encodeURIComponent(lines)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };


  const maxCal = Math.max(1, ...(summary?.byDay.map((d) => d.cals) ?? [1]));

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar
          title="Laporan 7 Hari"
          subtitle="Ringkasan kesehatan mingguan"
          showBack
          className="print:hidden"
        />

        <section className="grid grid-cols-2 gap-3 animate-fade-up">
          <Stat
            label="Total kalori masuk"
            value={`${Math.round(summary?.totals.cals ?? 0)}`}
            sub="kcal"
          />
          <Stat label="Kalori terbakar" value={`${summary?.totals.burn ?? 0}`} sub="kcal" />
          <Stat
            label="Total air"
            value={`${((summary?.totals.ml ?? 0) / 1000).toFixed(1)}`}
            sub="liter"
          />
          <Stat
            label="Total tidur"
            value={`${(summary?.totals.hours ?? 0).toFixed(1)}`}
            sub="jam"
          />
          <Stat label="Latihan" value={`${summary?.workoutCount ?? 0}`} sub="sesi" />
          <Stat label="Puasa selesai" value={`${summary?.fastingDone ?? 0}`} sub="sesi" />
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
            {aiMut.isPending ? "Menganalisis..." : "Analisis AI Mingguan"}
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
