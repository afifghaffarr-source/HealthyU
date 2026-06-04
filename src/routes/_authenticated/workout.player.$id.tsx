import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";

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

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => {
      setT((s) => {
        if (s > 1) return s - 1;
        // advance phase
        if (phase === "work") {
          setPhase("rest");
          return playlist[idx].rest;
        }
        const next = idx + 1;
        if (next >= playlist.length) {
          setRunning(false);
          return 0;
        }
        setIdx(next);
        setPhase("work");
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

  return (
    <div className="min-h-screen pb-28 px-4">
      <TopAppBar title={`Workout #${id}`} subtitle={`${idx + 1}/${playlist.length}`} showBack />
      <div className="mt-6 flex flex-col items-center gap-4">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">{phase === "work" ? "Latihan" : "Istirahat"}</p>
        <h2 className="text-3xl font-bold">{current.name}</h2>
        <div className="text-7xl font-mono font-bold text-primary">{t}s</div>
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
            className="size-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
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
      </div>
      <BottomNav />
    </div>
  );
}