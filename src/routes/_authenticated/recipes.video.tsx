import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, RotateCcw, ChefHat } from "lucide-react";

export const Route = createFileRoute("/_authenticated/recipes/video")({ component: Page });

type Step = { title: string; duration: number; tip?: string };

function Page() {
  const [title, setTitle] = useState("Nasi Goreng Sehat");
  const [steps] = useState<Step[]>([
    { title: "Tumis bawang", duration: 45, tip: "Tunggu sampai harum keemasan" },
    { title: "Masukkan nasi", duration: 60, tip: "Aduk merata supaya tidak gosong" },
    { title: "Bumbui & aduk", duration: 50, tip: "Garam, kecap, sedikit lada" },
    { title: "Plating", duration: 20, tip: "Tambah telur mata sapi & timun" },
  ]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<number | null>(null);

  const current = steps[idx];
  const progress = Math.min(1, elapsed / current.duration);

  useEffect(() => {
    if (!playing) return;
    timer.current = window.setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= current.duration) {
          if (idx < steps.length - 1) {
            setIdx((i) => i + 1);
            return 0;
          }
          setPlaying(false);
          return current.duration;
        }
        return e + 1;
      });
    }, 1000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [playing, idx, current.duration, steps.length]);

  const go = (n: number) => {
    const next = Math.max(0, Math.min(steps.length - 1, n));
    setIdx(next);
    setElapsed(0);
  };

  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Recipe Video" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4 animate-fade-up">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border bg-card text-sm font-semibold"
        />

        <div className="relative aspect-video rounded-3xl overflow-hidden bg-gradient-to-br from-primary/30 via-accent/20 to-primary/5 outline-1 outline-black/10">
          <div className="absolute inset-0 grid place-items-center text-center p-6">
            <div>
              <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-background/70 px-2 py-1 rounded-full mb-3">
                <ChefHat className="size-3" /> Step {idx + 1}/{steps.length}
              </div>
              <p className="text-2xl font-bold leading-tight">{current.title}</p>
              {current.tip && (
                <p className="text-xs text-muted-foreground mt-2 max-w-[24ch] mx-auto">
                  {current.tip}
                </p>
              )}
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/10">
            <div
              className="h-full bg-primary transition-[width] duration-1000 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="absolute top-3 right-3 text-[11px] font-bold tabular-nums bg-background/70 px-2 py-1 rounded-full">
            {String(Math.max(0, current.duration - elapsed)).padStart(2, "0")}s
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => go(idx - 1)}
            className="size-11 rounded-full bg-card border grid place-items-center"
          >
            <SkipBack className="size-4" />
          </button>
          <button
            onClick={() => setPlaying((p) => !p)}
            className="size-14 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-lg"
          >
            {playing ? <Pause className="size-6" /> : <Play className="size-6 translate-x-0.5" />}
          </button>
          <button
            onClick={() => go(idx + 1)}
            className="size-11 rounded-full bg-card border grid place-items-center"
          >
            <SkipForward className="size-4" />
          </button>
          <button
            onClick={() => {
              setElapsed(0);
            }}
            className="size-11 rounded-full bg-card border grid place-items-center"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>

        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li key={i}>
              <button
                onClick={() => go(i)}
                className={`w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-2xl transition ${
                  i === idx
                    ? "bg-primary/10 outline-1 outline-primary/30"
                    : "bg-card outline-1 outline-black/5"
                }`}
              >
                <span
                  className={`size-7 rounded-full grid place-items-center text-xs font-bold ${i === idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {i + 1}
                </span>
                <span className="flex-1 text-sm font-medium truncate">{s.title}</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {s.duration}s
                </span>
              </button>
            </li>
          ))}
        </ol>
      </main>
      <BottomNav />
    </div>
  );
}
