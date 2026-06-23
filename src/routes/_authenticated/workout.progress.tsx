/**
 * /workout/progress — PRs + weekly volume chart + streak.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { Trophy, TrendingUp, Flame } from "lucide-react";
import {
  getPersonalRecords,
  getVolumeProgress,
  getWorkoutStreak,
} from "@/features/workout/lib/workoutEnhanced.functions";
import { VolumeChart } from "@/features/workout/components/VolumeChart";

export const Route = createFileRoute("/_authenticated/workout/progress")({
  component: WorkoutProgressPage,
});

function WorkoutProgressPage() {
  const prsFn = useServerFn(getPersonalRecords);
  const volFn = useServerFn(getVolumeProgress);
  const streakFn = useServerFn(getWorkoutStreak);

  const { data: prs = [] } = useQuery({
    queryKey: ["workout", "prs"],
    queryFn: () => prsFn({ data: undefined }),
  });
  const { data: volume = [] } = useQuery({
    queryKey: ["workout", "volume"],
    queryFn: () => volFn({ data: { weeks: 8 } }),
  });
  const { data: streak } = useQuery({
    queryKey: ["workout", "streak"],
    queryFn: () => streakFn({ data: undefined }),
  });

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar
          title="Progress Latihan"
          subtitle="Personal records & volume mingguan"
          showBack
        />

        {/* Streak + stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-card rounded-3xl p-4 outline-1 outline-black/5">
            <Flame className="size-5 text-amber-500" />
            <p className="text-2xl font-bold mt-1 tabular-nums">{streak?.streak ?? 0}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Hari berturut
            </p>
          </div>
          <div className="bg-card rounded-3xl p-4 outline-1 outline-black/5">
            <Trophy className="size-5 text-primary" />
            <p className="text-2xl font-bold mt-1 tabular-nums">{prs.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              PR ter-track
            </p>
          </div>
        </div>

        {/* Volume chart */}
        <section className="bg-card rounded-3xl p-4 outline-1 outline-black/5 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            <p className="text-sm font-semibold">Volume 8 minggu</p>
          </div>
          <VolumeChart
            data={volume as Array<{ week_start: string; volume_kg: number; sessions: number }>}
          />
        </section>

        {/* PR list */}
        <section className="space-y-2">
          <p className="text-sm font-bold px-1">Personal Records</p>
          {prs.length === 0 ? (
            <div className="bg-card rounded-3xl p-6 text-center outline-1 outline-black/5">
              <Trophy className="size-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                Belum ada PR. Catat set dengan beban di latihan pertama kamu.
              </p>
            </div>
          ) : (
            (
              prs as Array<{
                exercise_id: string;
                exercise_name: string;
                muscle_group: string;
                max_weight_kg: number;
                reps_at_max: number;
                achieved_at: string;
              }>
            ).map((pr, i) => (
              <div
                key={pr.exercise_id}
                className="bg-card rounded-2xl p-3 outline-1 outline-black/5 flex items-center gap-3"
              >
                <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 grid place-items-center shrink-0">
                  <Trophy className="size-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{pr.exercise_name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {pr.muscle_group} · {i === 0 ? "Terberat" : `#${i + 1}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold tabular-nums">
                    {Number(pr.max_weight_kg).toLocaleString("id-ID", {
                      maximumFractionDigits: 1,
                    })}
                    kg
                  </p>
                  <p className="text-[10px] text-muted-foreground">× {pr.reps_at_max} reps</p>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
