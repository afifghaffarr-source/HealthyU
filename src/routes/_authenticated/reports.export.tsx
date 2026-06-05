import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { exportMealsCsv } from "@/features/scan/lib/scanMore.functions";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports/export")({
  component: Page,
});

function Page() {
  const fn = useServerFn(exportMealsCsv);
  const mut = useMutation({
    mutationFn: () => fn(),
    onSuccess: (r) => {
      const blob = new Blob([r.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meal-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${r.count} baris diekspor`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Export Meal Log" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <div className="rounded-2xl bg-card border p-6 text-center space-y-3">
          <Download className="size-10 mx-auto text-primary" />
          <h2 className="font-semibold">Export 30 hari terakhir</h2>
          <p className="text-xs text-muted-foreground">File CSV bisa dibuka di Excel / Sheets</p>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {mut.isPending && <Loader2 className="size-4 animate-spin" />}
            Download CSV
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
