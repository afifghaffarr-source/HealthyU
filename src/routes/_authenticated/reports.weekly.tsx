import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { generateWeeklyReport } from "@/features/scan/lib/scanBatch8.functions";
import { getWeeklyShareSummary } from "@/features/reports/lib/weeklyShare.functions";
import { renderShareCardPng, shareImage } from "@/features/reports/lib/shareCard";
import { Loader2, Download, FileText, Share2, Sparkles } from "lucide-react";
import { toast } from "@/lib/toast-config";

export const Route = createFileRoute("/_authenticated/reports/weekly")({ component: Page });

function Page() {
  const fn = useServerFn(generateWeeklyReport);
  const shareFn = useServerFn(getWeeklyShareSummary);
  const { data, isLoading } = useQuery({
    queryKey: ["weekly-report"],
    queryFn: () => fn({ data: undefined as never }),
  });
  const share = useQuery({
    queryKey: ["weekly-share-summary"],
    queryFn: () => shareFn({ data: {} as never }),
    staleTime: 60_000,
  });
  const [sharing, setSharing] = useState(false);

  const shareCard = share.data;

  const downloadTxt = () => {
    const blob = new Blob([data?.report?.content ?? ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weekly-${data?.report?.week_start}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sprint 28 — render share card to PNG then Web Share API.
  const shareMut = useMutation({
    mutationFn: async () => {
      if (!shareCard) throw new Error("Belum ada data minggu ini");
      setSharing(true);
      const blob = await renderShareCardPng(shareCard);
      const result = await shareImage({
        title: `HealthyU — Minggu ${shareCard.userName}`,
        text: shareCard.shareTagline,
        file: blob,
        fileName: `HealthyU-Weekly-${shareCard.weekStart}.png`,
      });
      return result;
    },
    onSuccess: (r) => {
      if (r.ok) toast.success(`Berhasil dibagikan (${r.via})`);
      else if (r.reason === "cancelled") toast.success("Dibatalkan");
      else toast.error("Gagal membagikan");
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setSharing(false),
  });

  const downloadPdf = async () => {
    if (!data?.report) return;
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("HealthyU — Laporan Mingguan", margin, 72);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(`Periode minggu: ${data.report.week_start}`, margin, 92);
    doc.setTextColor(20);
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(data.report.content || "", width);
    doc.text(lines, margin, 124);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text("Dibuat oleh HealthyU · healthyu.app", margin, doc.internal.pageSize.getHeight() - 32);
    doc.save(`HealthyU-Weekly-${data.report.week_start}.pdf`);
  };

  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Laporan Mingguan AI" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Menyusun ringkasan AI…
          </div>
        )}
        {data?.report && (
          <>
            <div className="rounded-2xl bg-card border p-4 whitespace-pre-wrap text-sm">
              {data.report.content}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={downloadPdf}
                className="rounded-xl bg-primary text-primary-foreground py-2.5 inline-flex items-center justify-center gap-2 text-sm font-semibold"
              >
                <FileText className="size-4" /> PDF
              </button>
              <button
                onClick={downloadTxt}
                className="rounded-xl border py-2.5 inline-flex items-center justify-center gap-2 text-sm"
              >
                <Download className="size-4" /> TXT
              </button>
            </div>
          </>
        )}

        {/* Sprint 28 — shareable weekly wrap-up card */}
        {shareCard && (
          <section className="rounded-2xl bg-gradient-to-br from-emerald-500/15 to-cyan-500/15 border border-emerald-500/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <Sparkles className="size-4" />
              <p className="font-semibold text-sm">Kartu Minggu — Shareable</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{shareCard.weekLabel}</p>
              <p className="text-base font-bold mt-0.5">{shareCard.headline}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat label="Kalori/hari" value={`${shareCard.avgCaloriesPerDay}kkal`} />
              <Stat label="Latihan" value={`${shareCard.avgWorkoutMinPerDay}m`} />
              <Stat label="Air/hari" value={`${shareCard.avgWaterMlPerDay}ml`} />
              <Stat label="Hari aktif" value={`${shareCard.daysActive}/7`} />
            </div>
            <div className="rounded-xl bg-background/70 px-3 py-2 border border-emerald-500/30 text-[13px] italic">
              {shareCard.shareTagline}
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => shareMut.mutate()}
                disabled={sharing}
                className="col-span-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 inline-flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50"
              >
                {sharing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Share2 className="size-4" />
                )}
                {sharing ? "Menyusun…" : "Bagikan Kartu"}
              </button>
              <p className="rounded-xl border border-emerald-500/30 px-2 py-1 text-xs text-muted-foreground text-center self-center">
                {shareCard.activityScore}/100 aktivitas
              </p>
            </div>
          </section>
        )}
        {share.isLoading && (
          <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Menghitung minggu…
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/70 px-3 py-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="font-bold text-base tabular-nums">{value}</div>
    </div>
  );
}
