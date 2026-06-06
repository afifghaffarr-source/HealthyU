import type { TranslationKey } from "@/lib/i18n";

export type Translator = (key: TranslationKey, vars?: Record<string, string | number>) => string;

export type WeeklyData = {
  meals: Array<{ logged_at: string; calories: number | string; meal_type: string }>;
  water: Array<{ logged_at: string; amount_ml: number }>;
  workouts: Array<{ performed_at: string; name: string; calories_burned: number }>;
  sleep: Array<{ sleep_start: string; sleep_end: string; quality: number | string }>;
  fasting: Array<{ start_time: string; protocol: string; completed: boolean | null }>;
};

export type WeeklySummary = {
  byDay: Array<{ day: string; cals: number; ml: number; burn: number; hours: number }>;
  totals: { cals: number; ml: number; burn: number; hours: number };
  fastingDone: number;
  workoutCount: number;
  sleepCount: number;
};

export type ArchiveReport = {
  id?: string;
  report_period_start?: string | null;
  report_period_end?: string | null;
  created_at: string;
  recommendations: unknown;
};

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportWeeklyCsv(data: WeeklyData) {
  const lines: string[] = ["type,date,detail,value"];
  data.meals.forEach((m) => lines.push(`meal,${m.logged_at},${m.meal_type},${m.calories}`));
  data.water.forEach((w) => lines.push(`water,${w.logged_at},,${w.amount_ml}`));
  data.workouts.forEach((w) =>
    lines.push(`workout,${w.performed_at},"${w.name}",${w.calories_burned}`),
  );
  data.sleep.forEach((s) =>
    lines.push(
      `sleep,${s.sleep_end},quality_${s.quality},${((new Date(s.sleep_end).getTime() - new Date(s.sleep_start).getTime()) / 3600000).toFixed(2)}`,
    ),
  );
  data.fasting.forEach((f) =>
    lines.push(`fasting,${f.start_time},${f.protocol},${f.completed ? "completed" : "incomplete"}`),
  );
  triggerDownload(
    new Blob([lines.join("\n")], { type: "text/csv" }),
    `laporan-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}
