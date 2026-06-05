import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import {
  getDailyChallenge,
  completeDailyChallenge,
  useStreakFreeze,
} from "@/features/scan/lib/scanSocial.functions";
import { Sparkles, Check, Snowflake, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/challenges/daily")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const getFn = useServerFn(getDailyChallenge);
  const completeFn = useServerFn(completeDailyChallenge);
  const freezeFn = useServerFn(useStreakFreeze);
  const { data, isLoading } = useQuery({
    queryKey: ["daily-challenge"],
    queryFn: () => getFn({ data: undefined as never }),
  });
  const completeMut = useMutation({
    mutationFn: (id: string) => completeFn({ data: { id } }),
    onSuccess: (r) => {
      toast.success(`+${r.coinsAwarded} coin!`);
      qc.invalidateQueries({ queryKey: ["daily-challenge"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const freezeMut = useMutation({
    mutationFn: () => freezeFn({ data: undefined as never }),
    onSuccess: () => toast.success("Streak freeze aktif untuk hari ini"),
    onError: (e: Error) => toast.error(e.message),
  });
  const c = data?.challenge;
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Tantangan Harian" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {isLoading && <Loader2 className="size-4 animate-spin" />}
        {c && (
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-5 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="size-5" />
              <span className="text-xs font-semibold uppercase">AI Challenge</span>
            </div>
            <h2 className="text-xl font-bold">{c.title}</h2>
            <p className="text-sm text-muted-foreground">{c.description}</p>
            {c.goal_value && (
              <div className="text-xs">
                Target: <b>{c.goal_value}</b> {c.goal_type}
              </div>
            )}
            <button
              disabled={c.completed || completeMut.isPending}
              onClick={() => completeMut.mutate(c.id)}
              className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Check className="size-4" />
              {c.completed ? "Selesai" : "Tandai Selesai (+10 coin)"}
            </button>
          </div>
        )}
        <div className="rounded-2xl bg-card border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Snowflake className="size-5 text-blue-500" />
            <h3 className="font-semibold">Streak Freeze</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Skip 1 hari tanpa kehilangan streak scan. Biaya 30 coin.
          </p>
          <button
            onClick={() => freezeMut.mutate()}
            disabled={freezeMut.isPending}
            className="w-full rounded-xl border border-blue-500/40 text-blue-600 py-2 text-sm font-medium"
          >
            Aktifkan Freeze (30 coin)
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
