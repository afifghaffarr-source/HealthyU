import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { celebrate } from "@/lib/confetti";

export const Route = createFileRoute("/_authenticated/workout/player/$id")({
  component: WorkoutPlayer,
});

const playlist = [
  { name: "Push-up", work: 45, rest: 15 },
  { name: "Squat", work: 45, rest: 15 },
  { name: "Plank", work: 45, rest: 15 },
];

function WorkoutPlayer() {
  const { id } = Route.useParams();
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"work" | "rest">("work");
  const [t, setT] = useState(playlist[0].work);
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "id-ID";
      window.speechSynthesis.speak(u);
    } catch {}
  };

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => {
      setT((s) => {
        if (s > 1) {
          if (s <= 4) speak(String(s - 1));
          return s - 1;
        }
        // advance phase
        if (phase === "work") {
          setPhase("rest");
          speak("Istirahat");
          return playlist[idx].rest;
        }
        const next = idx + 1;
        if (next >= playlist.length) {
          setRunning(false);
          speak("Selesai");
          celebrate({ intense: true });
          return 0;
        }
        setIdx(next);
        setPhase("work");
        speak(playlist[next].name);
        return playlist[next].work;
      });
    }, 1000);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [running, phase, idx]);

  const reset = () => {
    setRunning(false);
    setIdx(0);
    setPhase("work");
    setT(playlist[0].work);
  };

  const current = playlist[idx];
  const total = phase === "work" ? current.work : current.rest;
  const pct = total ? ((total - t) / total) * 100 : 0;
  const upNext = playlist[idx + 1];

  return (
    <div className="min-h-screen pb-28 px-4">
      <TopAppBar title={`Workout #${id}`} subtitle={`${idx + 1}/${playlist.length}`} showBack />
      <div className="mt-6 flex flex-col items-center gap-4">
        <p className={`text-xs uppercase tracking-wider font-bold px-3 py-1 rounded-full ${phase === "work" ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"}`}>
          {phase === "work" ? "Latihan" : "Istirahat"}
        </p>
        <h2 className="text-3xl font-bold">{current.name}</h2>
        <div className="relative size-56 grid place-items-center">
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
            <circle cx="50" cy="50" r="44" fill="none" strokeWidth="6" className="stroke-muted" />
            <circle
              cx="50" cy="50" r="44" fill="none" strokeWidth="6"
              className={phase === "work" ? "stroke-primary" : "stroke-accent"}
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - pct / 100)}`}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="text-6xl font-mono font-bold tabular-nums">{t}</div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="size-14 rounded-full bg-muted flex items-center justify-center"
            aria-label="Reset"
          >
            <RotateCcw className="size-5" />
          </button>
          <button
            onClick={() => setRunning((r) => !r)}
            className="size-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg active:scale-95 transition"
            aria-label={running ? "Pause" : "Play"}
          >
            {running ? <Pause className="size-6" /> : <Play className="size-6" />}
          </button>
          <button
            onClick={() => {
              if (idx < playlist.length - 1) {
                setIdx(idx + 1);
                setPhase("work");
                setT(playlist[idx + 1].work);
              }
            }}
            className="size-14 rounded-full bg-muted flex items-center justify-center"
            aria-label="Skip"
          >
            <SkipForward className="size-5" />
          </button>
        </div>
        {upNext && (
          <div className="mt-4 w-full max-w-xs rounded-2xl bg-card border p-3 text-center">
            <p className="text-xs text-muted-foreground">Selanjutnya</p>
            <p className="font-semibold">{upNext.name} · {upNext.work}s</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}