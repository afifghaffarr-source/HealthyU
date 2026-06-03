import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { dailyCoach } from "@/lib/coach.functions";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Sparkles, Loader2, Sun, Target, Lightbulb, AlertTriangle, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach")({
  component: CoachPage,
});

type CoachData = {
  greeting: string;
  focus: string;
  summary: string;
  tips: string[];
  warnings: string[];
  generated_at: string;
};

const CACHE_KEY = "sehatify_coach_cache";

function CoachPage() {
  const coachFn = useServerFn(dailyCoach);
  const [data, setData] = useState<CoachData | null>(null);

  const mut = useMutation({
    mutationFn: () => coachFn(),
    onSuccess: (d) => {
      setData(d);
      localStorage.setItem(CACHE_KEY, JSON.stringify(d));
    },
  });

  useEffect(() => {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      try {
        const cached = JSON.parse(raw) as CoachData;
        const age = Date.now() - new Date(cached.generated_at).getTime();
        if (age < 12 * 3600 * 1000) {
          setData(cached);
          return;
        }
      } catch {
        /* ignore */
      }
    }
    mut.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-8 space-y-5">
        <header className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="size-10 bg-card rounded-2xl outline-1 outline-black/10 grid place-items-center"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="size-5 text-primary" /> AI Coach
            </h1>
            <p className="text-xs text-muted-foreground">Rekomendasi pagi berbasis data 7 hari</p>
          </div>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="size-10 bg-card rounded-2xl outline-1 outline-black/10 grid place-items-center disabled:opacity-50"
          >
            {mut.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </button>
        </header>

        {mut.isPending && !data && (
          <div className="bg-card p-8 rounded-3xl outline-1 outline-black/5 text-center space-y-3">
            <Loader2 className="size-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">
              AI sedang menganalisis data Anda...
            </p>
          </div>
        )}

        {mut.isError && !data && (
          <div className="bg-destructive/10 p-5 rounded-3xl text-sm text-destructive">
            {mut.error instanceof Error ? mut.error.message : "Gagal memuat coach"}
          </div>
        )}

        {data && (
          <>
            <section className="bg-gradient-to-br from-primary/15 to-primary/5 p-6 rounded-3xl outline-1 outline-primary/10 space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Sun className="size-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Sapaan Pagi</span>
              </div>
              <p className="text-lg font-bold">{data.greeting}</p>
            </section>

            <section className="bg-card p-5 rounded-3xl outline-1 outline-black/5 space-y-2">
              <div className="flex items-center gap-2 text-coral">
                <Target className="size-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Fokus Hari Ini</span>
              </div>
              <p className="text-sm font-semibold leading-relaxed">{data.focus}</p>
            </section>

            {data.summary && (
              <section className="bg-card p-5 rounded-3xl outline-1 outline-black/5 space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Ringkasan Minggu Lalu
                </h2>
                <p className="text-sm leading-relaxed text-foreground/80">{data.summary}</p>
              </section>
            )}

            {data.tips.length > 0 && (
              <section className="bg-card p-5 rounded-3xl outline-1 outline-black/5 space-y-3">
                <div className="flex items-center gap-2 text-sage-deep">
                  <Lightbulb className="size-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Tips Hari Ini</span>
                </div>
                <ul className="space-y-2">
                  {data.tips.map((t, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-relaxed">
                      <span className="text-primary font-bold">{i + 1}.</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data.warnings.length > 0 && (
              <section className="bg-amber-500/10 p-5 rounded-3xl outline-1 outline-amber-500/20 space-y-2">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
                  <AlertTriangle className="size-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Perhatian</span>
                </div>
                <ul className="space-y-1.5">
                  {data.warnings.map((w, i) => (
                    <li key={i} className="text-sm leading-relaxed">
                      • {w}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <p className="text-xs text-center text-muted-foreground">
              Dibuat {new Date(data.generated_at).toLocaleString("id-ID")} • Bukan saran medis
            </p>
          </>
        )}
      </div>
      <BottomNav />
    </main>
  );
}