import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { generateWeeklyReport } from "@/lib/scanBatch8.functions";
import { Loader2, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports/weekly")({ component: Page });

function Page() {
  const fn = useServerFn(generateWeeklyReport);
  const { data, isLoading } = useQuery({ queryKey: ["weekly-report"], queryFn: () => fn({ data: undefined as any }) });
  const download = () => {
    const blob = new Blob([data?.report?.content ?? ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weekly-${data?.report?.week_start}.txt`;
    a.click();
  };
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Laporan Mingguan AI" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {isLoading && <Loader2 className="size-4 animate-spin" />}
        {data?.report && (
          <>
            <div className="rounded-2xl bg-card border p-4 whitespace-pre-wrap text-sm">{data.report.content}</div>
            <button onClick={download} className="w-full rounded-xl border py-2.5 inline-flex items-center justify-center gap-2 text-sm">
              <Download className="size-4" /> Download
            </button>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}