/**
 * ShareAchievementModal — share PR/streak/etc to community feed.
 * Auto-generates content from the milestone data.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2, Trophy, Flame, Dumbbell, Salad } from "lucide-react";
import { shareAchievement } from "@/features/groups/lib/socialEnhanced.functions";
import { toast } from "@/lib/toast-config";
import { toastError } from "@/lib/toast-config";

export type AchievementKind = "pr" | "streak" | "meal_plan" | "fasting" | "workout_complete";

type SharePayload = {
  kind: AchievementKind;
  content: string;
  metadata: Record<string, unknown>;
  reference_id?: string | null;
  category?: "general" | "diet" | "fasting" | "workout" | "motivation";
};

const KIND_META: Record<AchievementKind, { icon: typeof Trophy; label: string; color: string }> = {
  pr: { icon: Trophy, label: "Personal Record", color: "text-amber-500" },
  streak: { icon: Flame, label: "Streak", color: "text-orange-500" },
  meal_plan: { icon: Salad, label: "Meal Plan", color: "text-emerald-500" },
  fasting: { icon: Sparkles, label: "Fasting", color: "text-indigo-500" },
  workout_complete: { icon: Dumbbell, label: "Workout", color: "text-blue-500" },
};

export function ShareAchievementButton({
  payload,
  label = "Bagikan",
}: {
  payload: SharePayload;
  label?: string;
}) {
  const qc = useQueryClient();
  const shareFn = useServerFn(shareAchievement);

  const shareMut = useMutation({
    mutationFn: () =>
      shareFn({
        data: {
          share_kind: payload.kind,
          content: payload.content,
          share_metadata: payload.metadata,
          reference_id: payload.reference_id ?? null,
          category: payload.category ?? "general",
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Berbagi ke komunitas! 🎉");
    },
    onError: (e) => toastError(e, "Gagal berbagi"),
  });

  const meta = KIND_META[payload.kind];
  const Icon = meta.icon;

  return (
    <button
      onClick={() => shareMut.mutate()}
      disabled={shareMut.isPending}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary disabled:opacity-60"
    >
      {shareMut.isPending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <Icon className={`size-3.5 ${meta.color}`} />
      )}
      {label}
    </button>
  );
}

/**
 * Pre-baked payload generators for common achievements.
 */
// eslint-disable-next-line react-refresh/only-export-components -- feature barrel intentionally mixes components + constants (AUDIT-006 acknowledged baseline)
export const achievementPayload = {
  pr: (params: { exercise_name: string; weight_kg: number; reps: number }): SharePayload => ({
    kind: "pr",
    content: `🏆 PR baru! ${params.exercise_name}: ${params.weight_kg}kg × ${params.reps} reps. Latihan konsisten = hasil. 💪`,
    metadata: {
      exercise_name: params.exercise_name,
      weight_kg: params.weight_kg,
      reps: params.reps,
    },
    category: "workout",
  }),
  streak: (params: { days: number; kind: "workout" | "logging" | "fasting" }): SharePayload => {
    const labels = {
      workout: "latihan",
      logging: "catat makan",
      fasting: "puasa",
    };
    return {
      kind: "streak",
      content: `🔥 ${params.days} hari berturut ${labels[params.kind]}! Konsistensi kecil, hasil besar.`,
      metadata: { days: params.days, kind: params.kind },
      category: params.kind === "fasting" ? "fasting" : "motivation",
    };
  },
  workoutComplete: (params: {
    name: string;
    duration_min: number;
    volume_kg: number;
  }): SharePayload => ({
    kind: "workout_complete",
    content: `✅ Selesai! ${params.name} — ${params.duration_min} menit, volume ${params.volume_kg}kg.`,
    metadata: params,
    category: "workout",
  }),
  mealPlanAccepted: (params: { meals_count: number; total_kcal: number }): SharePayload => ({
    kind: "meal_plan",
    content: `📋 Meal plan baru: ${params.meals_count} menu, ${params.total_kcal} kcal. Lagi konsisten nih.`,
    metadata: params,
    category: "diet",
  }),
  fastingComplete: (params: { hours: number; protocol: string }): SharePayload => ({
    kind: "fasting",
    content: `🌙 Puasa ${params.protocol} ${params.hours} jam selesai. Tubuh fit, pikiran jernih.`,
    metadata: params,
    category: "fasting",
  }),
};
