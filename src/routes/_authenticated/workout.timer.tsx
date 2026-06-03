import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { logWorkoutTimer } from "@/lib/scanBatch11.functions";
import { Play, Pause, Square } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/workout/timer")({ component: Page });

function Page() {
  const fn = useServerFn(logWorkoutTimer);
  const [name, setName] = useState("HIIT");
  const [sec, setSec] = useState(0);
  const [run, setRun] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (run) ref.current = setInterval(() => setSec((s) => s + 1), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [run]);
  useEffect(() => {
    if (run && sec > 0 && sec % 30 === 0 && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(`${sec} detik`);
      u.lang = "id-ID";
      window.speechSynthesis.speak(u);
    }
  }, [sec, run]);
  const mut = useMutation({
    mutationFn: () => fn({ data: { exerciseName: name, totalSeconds: sec, rounds: 1 } }),
    onSuccess: () => { toast.success("Sesi tersimpan"); setSec(0); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Workout Timer" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-card" />
        <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 p-6 text-center space-y-4">
          <div className="text-6xl font-bold tabular-nums">{String(Math.floor(sec / 60)).padStart(2, "0")}:{String(sec % 60).padStart(2, "0")}</div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setRun((r) => !r)} className="size-14 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center">
              {run ? <Pause className="size-6" /> : <Play className="size-6" />}
            </button>
            <button onClick={() => { setRun(false); if (sec > 0) mut.mutate(); }} className="size-14 rounded-full border inline-flex items-center justify-center">
              <Square className="size-5" />
            </button>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}