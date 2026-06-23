/**
 * ProgramPicker — list preset programs with goal/level filter chips.
 * Each card → tap to start session for that program.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import {
  Dumbbell,
  Home,
  Flame,
  Mountain,
  Calendar,
  ChevronRight,
  Loader2,
  Crown,
} from "lucide-react";
import {
  getWorkoutPrograms,
  startWorkoutSession,
} from "@/features/workout/lib/workoutEnhanced.functions";
import { cn } from "@/lib/utils";

const GOAL_FILTERS = [
  { id: null, label: "Semua" },
  { id: "general_fitness", label: "Fitness" },
  { id: "hypertrophy", label: "Hipertrofi" },
  { id: "strength", label: "Strength" },
  { id: "fat_loss", label: "Fat Loss" },
] as const;

const LEVEL_FILTERS = [
  { id: null, label: "Semua" },
  { id: "beginner", label: "Pemula" },
  { id: "intermediate", label: "Menengah" },
  { id: "advanced", label: "Lanjut" },
] as const;

const GOAL_ICONS: Record<string, typeof Dumbbell> = {
  general_fitness: Dumbbell,
  hypertrophy: Mountain,
  strength: Dumbbell,
  endurance: Mountain,
  fat_loss: Flame,
};

export function ProgramPicker() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fn = useServerFn(getWorkoutPrograms);
  const startFn = useServerFn(startWorkoutSession);

  const [goal, setGoal] = useState<(typeof GOAL_FILTERS)[number]["id"]>(null);
  const [level, setLevel] = useState<(typeof LEVEL_FILTERS)[number]["id"]>(null);

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["workout", "programs", goal, level],
    queryFn: () => fn({ data: { goal: goal ?? undefined, level: level ?? undefined } }),
  });

  const startMut = useMutation({
    mutationFn: (program: { id: string; slug: string; days_per_week: number }) =>
      startFn({
        data: {
          program_id: program.id,
          day_number: 1,
          type: "strength",
          name: program.slug,
        },
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["workout", "active"] });
      navigate({ to: "/workout/active", search: { session: res.session_id } });
    },
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-2">
        <FilterRow
          label="Tujuan"
          options={GOAL_FILTERS}
          value={goal}
          onChange={(v) => setGoal(v)}
        />
        <FilterRow
          label="Level"
          options={LEVEL_FILTERS}
          value={level}
          onChange={(v) => setLevel(v)}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-3xl bg-card animate-pulse" />
          ))}
        </div>
      ) : programs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Tidak ada program dengan filter ini
        </p>
      ) : (
        <div className="space-y-2">
          {programs.map((p) => {
            const Icon = GOAL_ICONS[p.goal] ?? Dumbbell;
            const isStarting = startMut.isPending && startMut.variables?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => startMut.mutate(p)}
                disabled={startMut.isPending}
                className="w-full bg-card rounded-3xl p-4 outline-1 outline-black/5 flex items-center gap-3 active:scale-[0.98] transition text-left disabled:opacity-60"
              >
                <div className="size-11 rounded-2xl bg-primary/10 grid place-items-center shrink-0">
                  <Icon className="size-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{p.name}</p>
                    {p.is_premium && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                        <Crown className="size-2.5" />
                        Pro
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {p.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Calendar className="size-2.5" />
                      {p.days_per_week}x/minggu
                    </span>
                    <span>·</span>
                    <span>{p.duration_weeks} minggu</span>
                    <span>·</span>
                    <span className="capitalize">
                      {p.level === "beginner"
                        ? "Pemula"
                        : p.level === "intermediate"
                          ? "Menengah"
                          : "Lanjut"}
                    </span>
                    {(p.requires_equipment ?? []).includes("bodyweight") &&
                      !(
                        (p.requires_equipment ?? []).length > 1 &&
                        (p.requires_equipment ?? []).some((e) => e !== "bodyweight")
                      ) && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <Home className="size-2.5" />
                            No equipment
                          </span>
                        </>
                      )}
                  </div>
                </div>
                {isStarting ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterRow<T extends string | null>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
        {label}
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {options.map((o) => (
          <button
            key={o.label}
            onClick={() => onChange(o.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition",
              value === o.id
                ? "bg-primary text-primary-foreground"
                : "bg-card outline-1 outline-black/5",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
