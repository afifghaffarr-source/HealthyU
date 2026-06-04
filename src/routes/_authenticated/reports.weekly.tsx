import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { generateWeeklyReport } from "@/lib/scanBatch8.functions";
import { Loader2, Download, FileText } from "lucide-react";
import jsPDF from "jspdf";

export const Route = createFileRoute("/_authenticated/reports/weekly")({ component: Page });

function Page() {
  const fn = useServerFn(generateWeeklyReport);
  const { data, isLoading } = useQuery({
    queryKey: ["weekly-report"],
    queryFn: () => fn({ data: undefined as any }),
  });
  const downloadTxt = () => {
    const blob = new Blob([data?.report?.content ?? ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weekly-${data?.report?.week_start}.txt`;
    a.click();
  };
  const downloadPdf = () => {
    if (!data?.report) return;
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
        {isLoading && <Loader2 className="size-4 animate-spin" />}
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
      </main>
      <BottomNav />
    </div>
  );
}
