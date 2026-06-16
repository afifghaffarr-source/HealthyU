import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { logMeditation, listMeditations } from "@/features/scan/lib/scanBatch8.functions";
import { Play, Pause, RotateCcw } from "lucide-react";
import { toast } from "@/lib/toast-config";

export const Route = createFileRoute("/_authenticated/meditation")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const logFn = useServerFn(logMeditation);
  const listFn = useServerFn(listMeditations);
  const { data } = useQuery({
    queryKey: ["meditations"],
    queryFn: () => listFn({ data: undefined as never }),
  });
  const [target, setTarget] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [running]);
  const mut = useMutation({
    mutationFn: (m: number) => logFn({ data: { durationMin: m } }),
    onSuccess: () => {
      toast.success("Sesi tercatat");
      qc.invalidateQueries({ queryKey: ["meditations"] });
    },
  });
  const finish = () => {
    setRunning(false);
    const m = Math.max(1, Math.round(seconds / 60));
    mut.mutate(m);
    setSeconds(0);
  };
  const totalSec = target * 60;
  const pct = Math.min(100, (seconds / totalSec) * 100);
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Meditasi" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 p-6 text-center space-y-4">
          <div className="text-5xl font-bold tabular-nums">
            {String(Math.floor(seconds / 60)).padStart(2, "0")}:
            {String(seconds % 60).padStart(2, "0")}
          </div>
          <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex gap-2 justify-center">
            {[3, 5, 10, 20].map((m) => (
              <button
                key={m}
                onClick={() => setTarget(m)}
                className={`px-3 py-1 rounded-lg text-xs ${target === m ? "bg-primary text-primary-foreground" : "border"}`}
              >
                {m}m
              </button>
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setRunning((r) => !r)}
              className="size-14 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center"
              aria-label={running ? "Jeda meditasi" : "Mulai meditasi"}
            >
              {running ? <Pause className="size-6" /> : <Play className="size-6" />}
            </button>
            <button
              onClick={finish}
              className="size-14 rounded-full border inline-flex items-center justify-center"
              aria-label="Selesaikan sesi"
            >
              <RotateCcw className="size-5" />
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Riwayat</h3>
          {(data?.sessions ?? []).map((s) => (
            <div key={s.id} className="flex justify-between p-3 rounded-xl bg-card border text-sm">
              <span>{new Date(s.completed_at).toLocaleDateString("id-ID")}</span>
              <span className="font-medium">{s.duration_min} menit</span>
            </div>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
