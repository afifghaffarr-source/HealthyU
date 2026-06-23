/**
 * PersonalRecordsCard — top PRs (max weight per exercise) display.
 * Lightweight, no medal icon for top 3.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trophy, TrendingUp, ChevronRight } from "lucide-react";
import {
  getPersonalRecords,
  getWorkoutStreak,
} from "@/features/workout/lib/workoutEnhanced.functions";
import { cn } from "@/lib/utils";

type PR = {
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  max_weight_kg: number;
  reps_at_max: number;
  achieved_at: string;
};

const MUSCLE_LABEL: Record<string, string> = {
  chest: "Dada",
  back: "Punggung",
  legs: "Kaki",
  shoulders: "Bahu",
  arms: "Lengan",
  core: "Core",
  full_body: "Full body",
};

export function PersonalRecordsCard() {
  const fn = useServerFn(getPersonalRecords);
  const { data: prs = [] } = useQuery({
    queryKey: ["workout", "prs"],
    queryFn: () => fn({ data: undefined }),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Link
      to="/workout/progress"
      className="block bg-card rounded-3xl p-4 outline-1 outline-black/5 active:scale-[0.98] transition"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 grid place-items-center">
            <Trophy className="size-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">Personal Records</p>
            <p className="text-[11px] text-muted-foreground">{prs.length} exercise ter-track</p>
          </div>
        </div>
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>

      {prs.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          Catat set pertama kamu untuk mulai track PR
        </p>
      ) : (
        <div className="space-y-1.5">
          {(prs as PR[]).slice(0, 4).map((pr, i) => (
            <div key={pr.exercise_id} className="flex items-center gap-2 text-xs">
              <div
                className={cn(
                  "size-6 rounded-full grid place-items-center text-[10px] font-bold tabular-nums shrink-0",
                  i === 0 && "bg-amber-200 text-amber-800",
                  i === 1 && "bg-slate-200 text-slate-700",
                  i === 2 && "bg-orange-200 text-orange-800",
                  i >= 3 && "bg-muted text-muted-foreground",
                )}
              >
                {i + 1}
              </div>
              <span className="flex-1 truncate font-medium">{pr.exercise_name}</span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                {MUSCLE_LABEL[pr.muscle_group] ?? pr.muscle_group}
              </span>
              <span className="font-bold tabular-nums shrink-0">
                {Number(pr.max_weight_kg).toLocaleString("id-ID", {
                  maximumFractionDigits: 1,
                })}
                kg
              </span>
            </div>
          ))}
          {prs.length > 4 && (
            <p className="text-[10px] text-muted-foreground text-center pt-1">
              +{prs.length - 4} lainnya
            </p>
          )}
        </div>
      )}
    </Link>
  );
}

export function WorkoutStreakBadge() {
  const streakFn = useServerFn(getWorkoutStreak);
  const { data: streak } = useQuery({
    queryKey: ["workout", "streak"],
    queryFn: () => streakFn({ data: undefined }),
    staleTime: 5 * 60 * 1000,
  });

  if (!streak || streak.streak === 0) return null;

  return (
    <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full">
      <TrendingUp className="size-3" />
      Latihan {streak.streak} hari berturut
    </div>
  );
}
