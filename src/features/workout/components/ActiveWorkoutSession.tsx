/**
 * ActiveWorkoutSession — live workout tracker.
 *
 * Flow:
 *  1. Load session + program exercises (if linked to program)
 *  2. User taps exercise → expand → log set (reps/weight/RPE)
 *  3. PRs auto-detected (toast)
 *  4. Tap "Selesai" → finish session → navigate back
 */
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Play,
  Square,
  Star,
  Trophy,
  Plus,
  RotateCcw,
} from "lucide-react";
import {
  getSessionSets,
  logWorkoutSet,
  finishWorkoutSession,
  substituteExercise,
  getActiveSession,
  getProgramDay,
} from "@/features/workout/lib/workoutEnhanced.functions";
import { toast } from "@/lib/toast-config";
import { toastError } from "@/lib/toast-config";
import { cn } from "@/lib/utils";

type ProgramExercise = {
  id: string;
  exercise_id: string;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
  rest_seconds: number;
  order_index: number;
  exercise: {
    name: string;
    muscle_group: string;
    equipment: string;
    difficulty: string;
    avoid_for_conditions?: string[];
  };
};

type Set = {
  id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight_kg: number;
  rpe: number | null;
  is_warmup: boolean;
  is_pr: boolean;
  exercise: { name: string };
};

export function ActiveWorkoutSession() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/workout/active" });
  const sessionId =
    (search as { session?: string }).session ??
    // Fallback: load active session if no search param
    null;

  const sessionFn = useServerFn(getActiveSession);
  const setsFn = useServerFn(getSessionSets);
  const programFn = useServerFn(getProgramDay);
  const logSetFn = useServerFn(logWorkoutSet);
  const finishFn = useServerFn(finishWorkoutSession);
  const substituteFn = useServerFn(substituteExercise);

  const [elapsedSec, setElapsedSec] = useState(0);
  const [expandedExId, setExpandedExId] = useState<string | null>(null);
  const [expandedRest, setExpandedRest] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Load active session
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["workout", "active", sessionId],
    queryFn: async () => {
      if (sessionId) {
        // If we have a session ID from URL, fetch its sets directly.
        // The session is fetched separately to get program_id.
        const allSessions = await sessionFn({ data: undefined });
        return allSessions;
      }
      return sessionFn({ data: undefined });
    },
  });

  // 2. Load sets
  const activeId = sessionId ?? session?.id;
  const { data: sets = [] } = useQuery({
    queryKey: ["workout", "sets", activeId],
    queryFn: () => setsFn({ data: { session_id: activeId! } }),
    enabled: !!activeId,
  });

  // 3. Load program day exercises (if linked)
  const { data: programExercises = [] } = useQuery({
    queryKey: ["workout", "program-day", session?.program_id, 1],
    queryFn: () =>
      programFn({
        data: { program_id: session!.program_id!, day_number: 1 },
      }),
    enabled: !!session?.program_id,
  });

  // 4. Timer
  useEffect(() => {
    if (!session?.started_at) return;
    const startMs = new Date(session.started_at).getTime();
    timerRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startMs) / 1000));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.started_at]);

  // 5. Rest countdown
  useEffect(() => {
    if (expandedRest == null) return;
    const t = setTimeout(() => setExpandedRest(0), 1000);
    return () => clearTimeout(t);
  }, [expandedRest]);

  const logSetMut = useMutation({
    mutationFn: (input: {
      exercise_id: string;
      set_number: number;
      reps: number;
      weight_kg: number;
      rpe: number | null;
    }) =>
      logSetFn({
        data: {
          session_id: activeId!,
          exercise_id: input.exercise_id,
          set_number: input.set_number,
          reps: input.reps,
          weight_kg: input.weight_kg,
          rpe: input.rpe,
        },
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["workout", "sets", activeId] });
      qc.invalidateQueries({ queryKey: ["workout", "prs"] });
      if (res.is_pr) {
        toast.success(
          `🏆 PR baru! ${res.prev_max_kg ? `Sebelumnya ${res.prev_max_kg}kg` : "First record"}`,
        );
      }
    },
    onError: (e) => toastError(e, "Gagal catat set"),
  });

  const finishMut = useMutation({
    mutationFn: () => finishFn({ data: { session_id: activeId! } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["workout"] });
      qc.invalidateQueries({ queryKey: ["workout", "active"] });
      qc.invalidateQueries({ queryKey: ["workout", "prs"] });
      qc.invalidateQueries({ queryKey: ["workout", "streak"] });
      toast.success(`Latihan selesai! ${res.total_sets} set · ${res.total_volume_kg}kg volume`);
      navigate({ to: "/workout" });
    },
    onError: (e) => toastError(e, "Gagal finish"),
  });

  const substituteMut = useMutation({
    mutationFn: (exercise_id: string) =>
      substituteFn({ data: { exercise_id, reason: "equipment_missing" } }),
    onSuccess: (res) => {
      if (res.substitute) {
        toast.success(`Ganti ke ${res.substitute.name}: ${res.substitute.reason}`);
      } else {
        toast(res.reason);
      }
    },
    onError: (e) => toastError(e, "Gagal substitusi"),
  });

  if (sessionLoading) {
    return (
      <div className="grid place-items-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bg-card rounded-3xl p-8 text-center space-y-3 outline-1 outline-black/5">
        <Square className="size-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">
          Tidak ada sesi aktif. Mulai dari halaman program.
        </p>
      </div>
    );
  }

  // If no program: just show generic set logger
  const useProgram = programExercises.length > 0;
  const exerciseList: ProgramExercise[] = useProgram
    ? (programExercises as ProgramExercise[])
    : // Free-form: dedupe by exercise_id from logged sets
      Array.from(
        new Map(
          (sets as Set[]).map((s) => [
            s.exercise_id,
            {
              id: s.exercise_id,
              exercise_id: s.exercise_id,
              target_sets: 0,
              target_reps_min: 0,
              target_reps_max: 0,
              rest_seconds: 60,
              order_index: 0,
              exercise: {
                name: s.exercise.name,
                muscle_group: "",
                equipment: "",
                difficulty: "",
              },
            },
          ]),
        ).values(),
      );

  return (
    <div className="space-y-4">
      {/* Header: timer + finish */}
      <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl p-4 flex items-center gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Durasi
          </p>
          <p className="text-3xl font-mono font-bold tabular-nums">{formatTimer(elapsedSec)}</p>
        </div>
        <div className="flex-1 text-right">
          <p className="text-xs text-muted-foreground">{(sets as Set[]).length} set</p>
          <p className="text-xs font-semibold">
            Volume:{" "}
            <span className="tabular-nums">
              {Math.round(
                (sets as Set[])
                  .filter((s) => !s.is_warmup)
                  .reduce((sum, s) => sum + Number(s.weight_kg) * Number(s.reps), 0),
              )}
              kg
            </span>
          </p>
        </div>
        <button
          onClick={() => {
            if (confirm("Selesaikan sesi latihan ini?")) finishMut.mutate();
          }}
          disabled={finishMut.isPending}
          className="size-12 rounded-full bg-primary text-primary-foreground grid place-items-center disabled:opacity-60"
          aria-label="Selesaikan sesi"
        >
          {finishMut.isPending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Check className="size-5" />
          )}
        </button>
      </div>

      {/* Exercise list */}
      {exerciseList.length === 0 ? (
        <div className="bg-card rounded-3xl p-8 text-center space-y-3 outline-1 outline-black/5">
          <p className="text-sm text-muted-foreground">
            {useProgram
              ? "Mulai catat set pertama kamu"
              : "Latihan ini belum ada gerakan. Catat manual dari form di bawah."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {exerciseList.map((ex) => (
            <ExerciseRow
              key={ex.id}
              ex={ex}
              sets={(sets as Set[]).filter((s) => s.exercise_id === ex.exercise_id)}
              expanded={expandedExId === ex.exercise_id}
              onToggle={() =>
                setExpandedExId(expandedExId === ex.exercise_id ? null : ex.exercise_id)
              }
              onLogSet={(set) => logSetMut.mutate(set)}
              onSubstitute={() => substituteMut.mutate(ex.exercise_id)}
              logging={logMut.isPending || logSetMut.isPending}
              onRestStart={(sec) => setExpandedRest(sec)}
              restCountdown={expandedRest}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExerciseRow({
  ex,
  sets,
  expanded,
  onToggle,
  onLogSet,
  onSubstitute,
  logging,
  onRestStart,
  restCountdown,
}: {
  ex: ProgramExercise;
  sets: Set[];
  expanded: boolean;
  onToggle: () => void;
  onLogSet: (s: {
    exercise_id: string;
    set_number: number;
    reps: number;
    weight_kg: number;
    rpe: number | null;
  }) => void;
  onSubstitute: () => void;
  logging: boolean;
  onRestStart: (sec: number) => void;
  restCountdown: number | null;
}) {
  const workingSets = sets.filter((s) => !s.is_warmup);
  const target = ex.target_sets;
  const lastSet = workingSets[workingSets.length - 1];

  const [reps, setReps] = useState<number>(lastSet?.reps ?? 8);
  const [weight, setWeight] = useState<number>(Number(lastSet?.weight_kg ?? 0));
  const [rpe, setRpe] = useState<number | null>(lastSet?.rpe ?? null);

  const completed = workingSets.length;
  const isDone = target > 0 && completed >= target;

  return (
    <div
      className={cn(
        "bg-card rounded-3xl outline-1 overflow-hidden",
        isDone ? "outline-emerald-500/30" : "outline-black/5",
      )}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left active:bg-muted/30"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm truncate">{ex.exercise.name}</p>
            {isDone && <Check className="size-4 text-emerald-600 shrink-0" />}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {target > 0
              ? `${completed}/${target} set · target ${ex.target_reps_min}-${ex.target_reps_max} reps`
              : `${workingSets.length} set logged`}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-black/5 pt-3">
          {/* Logged sets */}
          {workingSets.length > 0 && (
            <div className="space-y-1">
              {workingSets.map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-xs tabular-nums">
                  <span className="text-muted-foreground font-bold w-6">#{s.set_number}</span>
                  <span className="flex-1">
                    {s.reps} reps × {Number(s.weight_kg)}kg
                  </span>
                  {s.rpe && <span className="text-muted-foreground">RPE {s.rpe}</span>}
                  {s.is_pr && (
                    <span className="inline-flex items-center gap-0.5 text-amber-600 font-bold">
                      <Trophy className="size-3" />
                      PR
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quick set logger */}
          <div className="grid grid-cols-3 gap-2">
            <NumberField label="Reps" value={reps} onChange={setReps} min={0} max={50} />
            <NumberField
              label="Berat (kg)"
              value={weight}
              onChange={setWeight}
              min={0}
              max={500}
              step={2.5}
            />
            <NumberField
              label="RPE"
              value={rpe ?? 0}
              onChange={(v) => setRpe(v === 0 ? null : v)}
              min={0}
              max={10}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                onLogSet({
                  exercise_id: ex.exercise_id,
                  set_number: workingSets.length + 1,
                  reps,
                  weight_kg: weight,
                  rpe,
                });
                if (ex.rest_seconds > 0) onRestStart(ex.rest_seconds);
              }}
              disabled={logging}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-2.5 rounded-2xl text-sm disabled:opacity-60"
            >
              {logging ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              Catat Set
            </button>
            {target === 0 && (
              <button
                onClick={onSubstitute}
                className="size-10 grid place-items-center rounded-2xl bg-muted"
                aria-label="Cari alternatif"
                title="Cari alternatif exercise"
              >
                <RotateCcw className="size-4" />
              </button>
            )}
          </div>

          {restCountdown != null && restCountdown > 0 && (
            <div className="flex items-center justify-center gap-2 bg-accent/20 text-accent-foreground py-2 rounded-2xl text-xs">
              <Play className="size-3" />
              Rest: {restCountdown}s
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[9px] font-bold uppercase text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        className="bg-background outline-1 outline-black/10 rounded-xl px-2 py-2 text-sm tabular-nums text-center"
      />
    </label>
  );
}

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
