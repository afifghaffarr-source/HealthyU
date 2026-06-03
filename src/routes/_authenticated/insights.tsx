import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { getDailyInsights, copyYesterdayMeals } from "@/lib/scanHistory.functions";
import { Sparkles, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

const opts = queryOptions({ queryKey: ["daily-insights"], queryFn: () => getDailyInsights() });

export const Route = createFileRoute("/_authenticated/insights")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
  errorComponent: ({ error }) => <div className="p-4 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-4">Tidak ditemukan</div>,
});

function Page() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const copyFn = useServerFn(copyYesterdayMeals);
  const copyMut = useMutation({
    mutationFn: () => copyFn({ data: {} }),
    onSuccess: (r) => {
      toast.success(r.inserted ? `${r.inserted} meal disalin dari kemarin` : "Tidak ada meal kemarin");
      qc.invalidateQueries({ queryKey: ["daily-insights"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function share() {
    const text = `${data.summary}\n\n${data.tips.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n— HealthyU`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "HealthyU Insight", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Disalin ke clipboard");
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Insight AI" />
      <div className="p-4 space-y-3">
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/0 border border-primary/20 p-4 space-y-2">
          <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Sparkles className="size-3" /> AI Insight 7 hari
          </div>
          <p className="text-sm">{data.summary}</p>
        </div>
        {data.tips.length > 0 && (
          <div className="rounded-2xl bg-card border p-4 space-y-2">
            <div className="text-sm font-medium">Tips untuk kamu</div>
            <ul className="space-y-1.5">
              {data.tips.map((t, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-primary font-bold">{i + 1}.</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => copyMut.mutate()}
            disabled={copyMut.isPending}
            className="rounded-xl bg-card border p-3 text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Copy className="size-4" /> Sama seperti kemarin
          </button>
          <button
            onClick={share}
            className="rounded-xl bg-card border p-3 text-sm font-medium inline-flex items-center justify-center gap-2"
          >
            <Share2 className="size-4" /> Bagikan
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}