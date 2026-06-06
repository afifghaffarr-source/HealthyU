import { Flame } from "lucide-react";

/**
 * Lightweight, qualitative consistency score. Combines today's signals
 * (meals logged, water hit, calories on-track, has a progress photo) into
 * a 0-100 score with supportive copy. No DB changes, no shaming.
 */
export function ConsistencyScoreCard({
  mealsLogged,
  waterReached,
  photosCount,
  calorieOnTrack,
}: {
  mealsLogged: number;
  waterReached: boolean;
  photosCount: number;
  calorieOnTrack: boolean;
}) {
  let score = 0;
  if (mealsLogged >= 1) score += 25;
  if (mealsLogged >= 3) score += 15;
  if (waterReached) score += 25;
  if (calorieOnTrack) score += 25;
  if (photosCount > 0) score += 10;
  score = Math.min(100, score);

  const tone =
    score >= 75
      ? "Mantap, lanjutkan ritmenya."
      : score >= 50
        ? "Sudah di jalur — sedikit lagi."
        : score >= 25
          ? "Awal yang baik, satu langkah kecil lagi."
          : "Mulai dari satu catatan hari ini.";

  return (
    <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 dark:outline-white/10 flex items-center gap-4 animate-fade-up">
      <div className="relative size-16 shrink-0">
        <svg viewBox="0 0 36 36" className="size-16 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-muted" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r="15.9"
            fill="none"
            className="stroke-primary"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${score}, 100`}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-sm font-bold tabular-nums">
          {score}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Flame className="size-3.5 text-primary" aria-hidden />
          <p className="text-sm font-semibold">Skor konsistensi hari ini</p>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{tone}</p>
      </div>
    </section>
  );
}
