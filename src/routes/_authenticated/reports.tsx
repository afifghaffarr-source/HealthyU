import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { weeklyReport, weeklyAiAnalysis, listAiReports } from "@/lib/reports.functions";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Download, FileText, Sparkles, Loader2, Share2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

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
      return ((prof as { last_seen_report_id?: string | null } | null)?.last_seen_report_id) ?? null;
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
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ai_reports" },
        () => {
          // Local-only: clear last-seen so the new row gets the "Baru" badge
          // immediately without waiting for the user to open it.
          qc.setQueryData(["profile-last-seen-report"], null);
          qc.invalidateQueries({ queryKey: ["ai-reports"] });
          // Suppress when the INSERT was caused by the user's own manual
          // generation (toast would duplicate aiMut's result).
          if (Date.now() - manualGenAtRef.current > 10000) {
            toast.success("📄 Laporan minggu baru tersedia");
          }
        },
      )
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
        window.setTimeout(() => setManualFlashId((cur) => (cur === latest ? null : cur)), 3000);
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal generate"),
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

  const exportCsv = () => {
    if (!data) return;
    const lines: string[] = ["type,date,detail,value"];
    data.meals.forEach((m) => lines.push(`meal,${m.logged_at},${m.meal_type},${m.calories}`));
    data.water.forEach((w) => lines.push(`water,${w.logged_at},,${w.amount_ml}`));
    data.workouts.forEach((w) =>
      lines.push(`workout,${w.performed_at},"${w.name}",${w.calories_burned}`),
    );
    data.sleep.forEach((s) =>
      lines.push(
        `sleep,${s.sleep_end},quality_${s.quality},${((new Date(s.sleep_end).getTime() - new Date(s.sleep_start).getTime()) / 3600000).toFixed(2)}`,
      ),
    );
    data.fasting.forEach((f) =>
      lines.push(
        `fasting,${f.start_time},${f.protocol},${f.completed ? "completed" : "incomplete"}`,
      ),
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    if (!data || !summary) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const today = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Laporan HealthyU - 7 Hari", 40, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Dicetak: ${today}`, 40, 68);
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 90,
      head: [["Metrik", "Nilai"]],
      body: [
        ["Total kalori masuk", `${Math.round(summary.totals.cals)} kcal`],
        ["Kalori terbakar", `${summary.totals.burn} kcal`],
        ["Total air", `${(summary.totals.ml / 1000).toFixed(1)} L`],
        ["Total tidur", `${summary.totals.hours.toFixed(1)} jam`],
        ["Latihan", `${summary.workoutCount} sesi`],
        ["Puasa selesai", `${summary.fastingDone} sesi`],
      ],
      styles: { font: "helvetica", fontSize: 10 },
      headStyles: { fillColor: [107, 142, 90] },
    });

    autoTable(doc, {
      head: [["Tanggal", "Kalori (kcal)", "Air (ml)", "Bakar (kcal)", "Tidur (jam)"]],
      body: summary.byDay.map((d) => [
        new Date(d.day).toLocaleDateString("id-ID", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
        Math.round(d.cals).toString(),
        d.ml.toString(),
        d.burn.toString(),
        d.hours.toFixed(1),
      ]),
      styles: { font: "helvetica", fontSize: 9 },
      headStyles: { fillColor: [107, 142, 90] },
    });

    if (aiMut.data?.report) {
      const lastY =
        (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 200;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Analisis AI", 40, lastY + 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(aiMut.data.report, 515);
      doc.text(lines, 40, lastY + 48);
    }

    doc.save(`laporan-healthyu-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const shareWhatsapp = (overrideReport?: { text: string; periodStart?: string; periodEnd?: string }) => {
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
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
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
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-8 space-y-5">
        <header className="flex items-center gap-3">
          <Link
            to="/profile"
            className="size-10 bg-card rounded-2xl outline-1 outline-black/10 grid place-items-center print:hidden"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Laporan 7 Hari</h1>
            <p className="text-xs text-muted-foreground">Ringkasan kesehatan mingguan</p>
          </div>
        </header>

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

        <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 animate-fade-up">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Kalori harian
          </p>
          <div className="flex items-end gap-2 h-32">
            {summary?.byDay.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex-1 w-full flex items-end">
                  <div
                    className="w-full bg-primary rounded-t-md transition-all"
                    style={{
                      height: `${(d.cals / maxCal) * 100}%`,
                      minHeight: d.cals > 0 ? "4px" : 0,
                    }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground tabular-nums">
                  {new Date(d.day).toLocaleDateString("id-ID", { weekday: "narrow" })}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-3 gap-2 print:hidden">
          <button
            onClick={exportCsv}
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-2xl"
          >
            <Download className="size-4" /> <span className="text-sm">CSV</span>
          </button>
          <button
            onClick={exportPdf}
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
          <section className="space-y-2 animate-fade-up">
            <div className="flex items-center justify-between gap-2 px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Riwayat Laporan AI
              </h2>
              <select
                value={rangeWeeks}
                onChange={(e) => setRangeWeeks(Number(e.target.value))}
                className="text-[11px] bg-card outline-1 outline-black/10 rounded-lg px-2 py-1"
              >
                <option value={0}>Semua</option>
                <option value={4}>4 minggu</option>
                <option value={12}>12 minggu</option>
                <option value={26}>26 minggu</option>
              </select>
            </div>
            {history
              .filter((r) => {
                if (rangeWeeks === 0) return true;
                const cutoff = Date.now() - rangeWeeks * 7 * 86400000;
                return new Date(r.created_at).getTime() >= cutoff;
              })
              .map((r, idx) => {
              const text = Array.isArray(r.recommendations) ? String(r.recommendations[0] ?? "") : "";
              const isNew = idx === 0 && latestId === r.id && lastSeenId !== r.id;
              const isManualFlash = manualFlashId === r.id;
              return (
                <details
                  key={r.id}
                  open={(focus === "latest" && idx === 0) || isNew}
                  className={
                    isManualFlash
                      ? "bg-card rounded-2xl outline-2 outline-amber-400 p-4 ring-4 ring-amber-200 shadow-md animate-fade-up"
                      : isNew
                      ? "bg-card rounded-2xl outline-2 outline-primary p-4 ring-2 ring-primary/20 shadow-md animate-fade-up"
                      : "bg-card rounded-2xl outline-1 outline-black/5 p-4"
                  }
                >
                  <summary className="cursor-pointer text-sm font-semibold flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      {isNew && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                          Baru
                        </span>
                      )}
                      {r.report_period_start} → {r.report_period_end}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("id-ID")}
                    </span>
                  </summary>
                  <p className="mt-3 text-sm whitespace-pre-wrap leading-relaxed">{text}</p>
                  {isManualFlash && text && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        shareWhatsapp({
                          text,
                          periodStart: r.report_period_start,
                          periodEnd: r.report_period_end,
                        });
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 bg-[#25D366] text-white text-xs font-semibold px-3 py-1.5 rounded-full"
                    >
                      <Share2 className="size-3" /> Share
                    </button>
                  )}
                </details>
              );
            })}
          </section>
        )}
      </div>
      <BottomNav />
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card p-4 rounded-2xl outline-1 outline-black/5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-2xl font-bold tabular-nums mt-1">
        {value}
        <span className="text-xs font-medium text-muted-foreground ml-1">{sub}</span>
      </p>
    </div>
  );
}
