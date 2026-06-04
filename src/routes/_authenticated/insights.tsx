import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { getDailyInsights, copyYesterdayMeals } from "@/lib/scanHistory.functions";
import { Sparkles, Copy, Share2, Lightbulb, RefreshCw } from "lucide-react";
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
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4 animate-fade-up pb-24">
        <section className="relative rounded-3xl overflow-hidden p-5 bg-gradient-to-br from-primary via-primary/80 to-accent text-primary-foreground outline-1 outline-black/5">
          <div className="absolute -right-8 -top-8 size-32 rounded-full bg-white/10 blur-xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-1 rounded-full">
              <Sparkles className="size-3" /> AI Insight · 7 hari
            </div>
            <p className="mt-3 text-base leading-relaxed font-medium">{data.summary}</p>
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ["daily-insights"] })}
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold bg-white/15 hover:bg-white/25 transition px-2.5 py-1.5 rounded-full"
            >
              <RefreshCw className="size-3" /> Perbarui
            </button>
          </div>
        </section>

        {data.tips.length > 0 && (
          <section className="rounded-3xl bg-card outline-1 outline-black/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-amber-100 text-amber-600 grid place-items-center">
                <Lightbulb className="size-4" />
              </div>
              <h2 className="font-bold text-sm">Tips untuk kamu</h2>
            </div>
            <ul className="space-y-2">
              {data.tips.map((t, i) => (
                <li key={i} className="flex gap-3 bg-muted/40 rounded-2xl p-3">
                  <span className="shrink-0 size-6 rounded-full bg-primary text-primary-foreground grid place-items-center text-[11px] font-bold">{i + 1}</span>
                  <span className="text-sm leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => copyMut.mutate()}
            disabled={copyMut.isPending}
            className="rounded-2xl bg-card outline-1 outline-black/5 p-3.5 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-muted/50 transition"
          >
            <Copy className="size-4" /> Sama seperti kemarin
          </button>
          <button
            onClick={share}
            className="rounded-2xl bg-card outline-1 outline-black/5 p-3.5 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-muted/50 transition"
          >
            <Share2 className="size-4" /> Bagikan
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}