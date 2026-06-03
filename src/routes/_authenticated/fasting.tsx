import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { currentFast, startFast, stopFast } from "@/lib/fasting.functions";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft } from "lucide-react";
import { FASTING_PROTOCOLS, fastingStage, formatDuration } from "@/lib/health";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fasting")({
  component: FastingPage,
});

function FastingPage() {
  const qc = useQueryClient();
  const fetchFast = useServerFn(currentFast);
  const startFn = useServerFn(startFast);
  const stopFn = useServerFn(stopFast);

  const { data: fast } = useQuery({ queryKey: ["fast", "current"], queryFn: () => fetchFast() });

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!fast) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [fast]);

  const startMut = useMutation({
    mutationFn: (p: { protocol: string; target_hours: number }) => startFn({ data: p }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fast"] });
      toast.success("Puasa dimulai. Semangat!");
    },
  });
  const stopMut = useMutation({
    mutationFn: (id: string) => stopFn({ data: { id } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["fast"] });
      toast.success(r.completed ? "Selamat! Puasa tercapai 🎉" : "Puasa dihentikan");
    },
  });

  const elapsedMs = fast ? now - new Date(fast.start_time).getTime() : 0;
  const elapsedHrs = elapsedMs / 3600000;
  const pct = fast ? Math.min(100, (elapsedHrs / Number(fast.target_hours)) * 100) : 0;

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-8 space-y-5">
        <header className="flex items-center gap-3">
          <Link to="/dashboard" className="size-10 bg-card rounded-2xl outline-1 outline-black/10 grid place-items-center">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-2xl font-bold">Puasa</h1>
        </header>

        {fast ? (
          <section className="bg-gradient-to-br from-sage to-sage-deep text-primary-foreground p-8 rounded-[2rem] relative overflow-hidden animate-fade-up">
            <div className="absolute -right-10 -top-10 size-40 bg-white/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <p className="text-xs uppercase tracking-widest text-white/70 font-bold mb-2">Protokol {fast.protocol}</p>
              <p className="text-5xl font-bold tabular-nums mb-2">{formatDuration(elapsedMs)}</p>
              <p className="text-sm text-white/80 mb-6">Target: {Number(fast.target_hours)} jam</p>
              <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-coral transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-sm font-medium mb-6">{fastingStage(elapsedHrs)}</p>
              <button
                onClick={() => stopMut.mutate(fast.id)}
                disabled={stopMut.isPending}
                className="w-full bg-white text-sage-deep font-bold py-3.5 rounded-2xl"
              >
                Hentikan puasa
              </button>
            </div>
          </section>
        ) : (
          <section className="space-y-3 animate-fade-up">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Pilih protokol</h2>
            {FASTING_PROTOCOLS.map((p) => (
              <button
                key={p.id}
                onClick={() => startMut.mutate({ protocol: p.id, target_hours: p.fast })}
                disabled={startMut.isPending}
                className="w-full bg-card p-5 rounded-3xl outline-1 outline-black/5 text-left hover:bg-secondary/40 transition flex items-center justify-between"
              >
                <div>
                  <p className="font-bold">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.fast}j puasa · {p.eat}j makan</p>
                </div>
                <span className="text-primary font-bold text-sm">Mulai →</span>
              </button>
            ))}
          </section>
        )}
      </div>
      <BottomNav />
    </main>
  );
}