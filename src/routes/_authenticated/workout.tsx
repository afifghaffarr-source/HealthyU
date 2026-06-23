import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  logWorkout,
  recentWorkouts,
  deleteWorkout,
} from "@/features/workout/lib/workouts.functions";
import { getActiveSession } from "@/features/workout/lib/workoutEnhanced.functions";
import { BottomNav } from "@/components/bottom-nav";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { Activity, Trash2, WifiOff, RefreshCw, Play, Trophy, BarChart3 } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { toastError } from "@/lib/toast-config";
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
  const activeFn = useServerFn(getActiveSession);
  const { online, pending, sync } = useOfflineQueue();

  const { data: sessions = [] } = useQuery({
    queryKey: ["workouts"],
    queryFn: () => list(),
  });

  const { data: activeSession } = useQuery({
    queryKey: ["workout", "active"],
    queryFn: () => activeFn({ data: undefined }),
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
    onError: (e) => toastError(e, "Gagal"),
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

        {/* Active session banner */}
        {activeSession && (
          <Link
            to="/workout/active"
            search={{ session: activeSession.id }}
            className="flex items-center gap-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 rounded-3xl animate-fade-up"
          >
            <div className="size-11 rounded-full bg-white/20 grid place-items-center shrink-0">
              <Play className="size-5 fill-current" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                Sesi Aktif
              </p>
              <p className="font-semibold truncate">{activeSession.name}</p>
              <p className="text-xs opacity-80">
                Dimulai{" "}
                {new Date(activeSession.started_at).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </Link>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2 animate-fade-up">
          <Link
            to="/workout/programs"
            className="flex items-center gap-2 bg-card p-3 rounded-2xl outline-1 outline-black/5 active:scale-[0.98] transition"
          >
            <Activity className="size-4 text-primary" />
            <span className="text-xs font-semibold">Program</span>
          </Link>
          <Link
            to="/workout/progress"
            className="flex items-center gap-2 bg-card p-3 rounded-2xl outline-1 outline-black/5 active:scale-[0.98] transition"
          >
            <Trophy className="size-4 text-amber-500" />
            <span className="text-xs font-semibold">Progress</span>
          </Link>
        </div>

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
