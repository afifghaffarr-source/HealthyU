import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { weeklyReport, weeklyAiAnalysis } from "@/lib/reports.functions";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Download, Printer, Sparkles, Loader2, Share2 } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

function dayKey(d: string | Date) {
  return new Date(d).toISOString().slice(0, 10);
}

function ReportsPage() {
  const fetchFn = useServerFn(weeklyReport);
  const aiFn = useServerFn(weeklyAiAnalysis);
  const { data } = useQuery({
    queryKey: ["report", 7],
    queryFn: () => fetchFn({ data: { days: 7 } }),
  });
  const aiMut = useMutation({
    mutationFn: () => aiFn({ data: { days: 7 } }),
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
      const cals = data.meals.filter((m) => dayKey(m.logged_at) === day).reduce((s, m) => s + Number(m.calories || 0), 0);
      const ml = data.water.filter((w) => dayKey(w.logged_at) === day).reduce((s, w) => s + (w.amount_ml || 0), 0);
      const burn = data.workouts.filter((w) => dayKey(w.performed_at) === day).reduce((s, w) => s + (w.calories_burned || 0), 0);
      const slept = data.sleep.filter((s) => dayKey(s.sleep_end) === day);
      const hours = slept.reduce((s, x) => s + (new Date(x.sleep_end).getTime() - new Date(x.sleep_start).getTime()) / 3600000, 0);
      return { day, cals, ml, burn, hours };
    });
    const totals = byDay.reduce(
      (a, b) => ({ cals: a.cals + b.cals, ml: a.ml + b.ml, burn: a.burn + b.burn, hours: a.hours + b.hours }),
      { cals: 0, ml: 0, burn: 0, hours: 0 },
    );
    const fastingDone = data.fasting.filter((f) => f.completed).length;
    return { byDay, totals, fastingDone, workoutCount: data.workouts.length, sleepCount: data.sleep.length };
  }, [data]);

  const exportCsv = () => {
    if (!data) return;
    const lines: string[] = ["type,date,detail,value"];
    data.meals.forEach((m) => lines.push(`meal,${m.logged_at},${m.meal_type},${m.calories}`));
    data.water.forEach((w) => lines.push(`water,${w.logged_at},,${w.amount_ml}`));
    data.workouts.forEach((w) => lines.push(`workout,${w.performed_at},"${w.name}",${w.calories_burned}`));
    data.sleep.forEach((s) => lines.push(`sleep,${s.sleep_end},quality_${s.quality},${((new Date(s.sleep_end).getTime() - new Date(s.sleep_start).getTime()) / 3600000).toFixed(2)}`));
    data.fasting.forEach((f) => lines.push(`fasting,${f.start_time},${f.protocol},${f.completed ? "completed" : "incomplete"}`));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareWhatsapp = () => {
    if (!summary) return;
    const lines = [
      "📊 *Laporan HealthyU 7 Hari*",
      "",
      `🍽️ Total kalori masuk: ${Math.round(summary.totals.cals)} kcal`,
      `🔥 Kalori terbakar: ${summary.totals.burn} kcal`,
      `💧 Total air: ${(summary.totals.ml / 1000).toFixed(1)} L`,
      `😴 Total tidur: ${summary.totals.hours.toFixed(1)} jam`,
      `🏃 Latihan: ${summary.workoutCount} sesi`,
      `⏱️ Puasa selesai: ${summary.fastingDone} sesi`,
      "",
      aiMut.data?.report ? `_${aiMut.data.report.slice(0, 400)}${aiMut.data.report.length > 400 ? "…" : ""}_` : "",
      "— dikirim dari HealthyU",
    ].filter(Boolean).join("\n");
    const url = `https://wa.me/?text=${encodeURIComponent(lines)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const maxCal = Math.max(1, ...(summary?.byDay.map((d) => d.cals) ?? [1]));

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-8 space-y-5">
        <header className="flex items-center gap-3">
          <Link to="/profile" className="size-10 bg-card rounded-2xl outline-1 outline-black/10 grid place-items-center print:hidden">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Laporan 7 Hari</h1>
            <p className="text-xs text-muted-foreground">Ringkasan kesehatan mingguan</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 animate-fade-up">
          <Stat label="Total kalori masuk" value={`${Math.round(summary?.totals.cals ?? 0)}`} sub="kcal" />
          <Stat label="Kalori terbakar" value={`${summary?.totals.burn ?? 0}`} sub="kcal" />
          <Stat label="Total air" value={`${((summary?.totals.ml ?? 0) / 1000).toFixed(1)}`} sub="liter" />
          <Stat label="Total tidur" value={`${(summary?.totals.hours ?? 0).toFixed(1)}`} sub="jam" />
          <Stat label="Latihan" value={`${summary?.workoutCount ?? 0}`} sub="sesi" />
          <Stat label="Puasa selesai" value={`${summary?.fastingDone ?? 0}`} sub="sesi" />
        </section>

        <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 animate-fade-up">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Kalori harian</p>
          <div className="flex items-end gap-2 h-32">
            {summary?.byDay.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex-1 w-full flex items-end">
                  <div
                    className="w-full bg-primary rounded-t-md transition-all"
                    style={{ height: `${(d.cals / maxCal) * 100}%`, minHeight: d.cals > 0 ? "4px" : 0 }}
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
          <button onClick={exportCsv} className="flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-2xl">
            <Download className="size-4" /> <span className="text-sm">CSV</span>
          </button>
          <button onClick={() => window.print()} className="flex items-center justify-center gap-2 bg-card outline-1 outline-black/10 font-semibold py-3 rounded-2xl">
            <Printer className="size-4" /> <span className="text-sm">PDF</span>
          </button>
          <button onClick={shareWhatsapp} className="flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold py-3 rounded-2xl">
            <Share2 className="size-4" /> <span className="text-sm">WA</span>
          </button>
        </section>

        <section className="space-y-3 animate-fade-up">
          <button
            onClick={() => aiMut.mutate()}
            disabled={aiMut.isPending}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold py-3 rounded-2xl shadow-lg disabled:opacity-60"
          >
            {aiMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {aiMut.isPending ? "Menganalisis..." : "Analisis AI Mingguan"}
          </button>
          {aiMut.data && (
            <article className="bg-card p-5 rounded-3xl outline-1 outline-black/5 text-sm leading-relaxed whitespace-pre-wrap">
              {aiMut.data.report}
            </article>
          )}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card p-4 rounded-2xl outline-1 outline-black/5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums mt-1">{value}<span className="text-xs font-medium text-muted-foreground ml-1">{sub}</span></p>
    </div>
  );
}