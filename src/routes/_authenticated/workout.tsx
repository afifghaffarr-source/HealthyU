import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { logWorkout, recentWorkouts, deleteWorkout } from "@/lib/workouts.functions";
import { BottomNav } from "@/components/bottom-nav";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { Activity, Trash2, WifiOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { enqueue } from "@/lib/offline-queue";
import { useOfflineQueue } from "@/hooks/use-offline-queue";

export const Route = createFileRoute("/_authenticated/workout")({
  component: WorkoutPage,
});

const TYPES = [
  { id: "cardio", label: "Kardio", emoji: "🏃" },
  { id: "strength", label: "Strength", emoji: "🏋️" },
  { id: "hiit", label: "HIIT", emoji: "🔥" },
  { id: "yoga", label: "Yoga", emoji: "🧘" },
  { id: "walking", label: "Jalan", emoji: "🚶" },
  { id: "cycling", label: "Sepeda", emoji: "🚴" },
] as const;

function WorkoutPage() {
  const qc = useQueryClient();
  const list = useServerFn(recentWorkouts);
  const log = useServerFn(logWorkout);
  const del = useServerFn(deleteWorkout);
  const { online, pending, sync } = useOfflineQueue();

  const { data: sessions = [] } = useQuery({
    queryKey: ["workouts"],
    queryFn: () => list(),
  });

  const [type, setType] = useState<(typeof TYPES)[number]["id"]>("cardio");
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(30);
  const [calories, setCalories] = useState(200);
  const [intensity, setIntensity] = useState<"low" | "medium" | "high">("medium");

  const logMut = useMutation({
    mutationFn: async () => {
      const payload = {
        type,
        name: name || TYPES.find((t) => t.id === type)!.label,
        duration_min: duration,
        calories_burned: calories,
        intensity,
      };
      if (!navigator.onLine) {
        await enqueue("workout", payload);
        return { offline: true as const };
      }
      return log({ data: payload });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["workouts"] });
      toast.success(
        res && "offline" in res && res.offline
          ? "Latihan disimpan offline. Akan sync otomatis."
          : "Latihan dicatat",
      );
      setName("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workouts"] }),
  });

  const totalCal = sessions.reduce((s, w) => s + (w.calories_burned || 0), 0);
  const totalMin = sessions.reduce((s, w) => s + (w.duration_min || 0), 0);

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar
          title="Latihan"
          subtitle={`${sessions.length} sesi · ${totalMin} menit · ${totalCal} kcal`}
          showBack
          action={
            !online || pending > 0 ? (
              <button
                onClick={() => sync()}
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-full ${online ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}
              >
                {online ? <RefreshCw className="size-3" /> : <WifiOff className="size-3" />}
                {online ? `Sync ${pending}` : `Offline${pending ? ` · ${pending}` : ""}`}
              </button>
            ) : undefined
          }
        />

        <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 space-y-3 animate-fade-up">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Catat sesi baru
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={`p-2 rounded-2xl text-xs font-semibold flex flex-col items-center gap-1 transition-colors ${
                  type === t.id ? "bg-primary text-primary-foreground" : "bg-mint"
                }`}
              >
                <span className="text-lg">{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama (mis. Lari pagi)"
            className="w-full bg-background outline-1 outline-black/10 rounded-2xl px-4 py-3 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                Durasi (min)
              </span>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="bg-background outline-1 outline-black/10 rounded-2xl px-4 py-3 text-sm tabular-nums"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Kalori</span>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(Number(e.target.value))}
                className="bg-background outline-1 outline-black/10 rounded-2xl px-4 py-3 text-sm tabular-nums"
              />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["low", "medium", "high"] as const).map((i) => (
              <button
                key={i}
                onClick={() => setIntensity(i)}
                className={`py-2 rounded-2xl text-xs font-semibold capitalize ${
                  intensity === i ? "bg-accent text-accent-foreground" : "bg-mint"
                }`}
              >
                {i === "low" ? "Ringan" : i === "medium" ? "Sedang" : "Berat"}
              </button>
            ))}
          </div>
          <button
            onClick={() => logMut.mutate()}
            disabled={logMut.isPending}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-2xl"
          >
            Simpan sesi
          </button>
        </section>

        <section className="space-y-2 animate-fade-up">
          <h2 className="text-sm font-bold px-1">Riwayat</h2>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Belum ada sesi tercatat
            </p>
          ) : (
            sessions.map((w) => (
              <div
                key={w.id}
                className="bg-card p-3 rounded-2xl outline-1 outline-black/5 flex items-center gap-3"
              >
                <div className="size-12 rounded-xl bg-mint grid place-items-center">
                  <Activity className="size-5 text-sage-deep" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{w.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.duration_min} min · {w.calories_burned} kcal ·{" "}
                    {new Date(w.performed_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <button
                  onClick={() => delMut.mutate(w.id)}
                  className="p-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          )}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
