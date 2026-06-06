import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { weekMealStats } from "@/features/meals/lib/meals.functions";
import { Award } from "lucide-react";

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function MostConsistentDayBadge({ calTarget }: { calTarget: number }) {
  const fetch = useServerFn(weekMealStats);
  const { data: days = [] } = useQuery({
    queryKey: ["meals", "week-stats"],
    queryFn: () => fetch(),
    staleTime: 1000 * 60 * 5,
  });

  // Score: prefer days with ≥3 meals AND calories between 70%–105% of target.
  const scored = days
    .filter((d) => d.meals > 0)
    .map((d) => {
      const ratio = d.calories / Math.max(1, calTarget);
      const inBand = ratio >= 0.7 && ratio <= 1.05 ? 1 : 0;
      const score = d.meals * 10 + inBand * 50 - Math.abs(1 - ratio) * 20;
      return { ...d, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.meals < 2) return null;

  const dayName = DAY_NAMES[new Date(best.date).getDay()];
  return (
    <section className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 p-4 rounded-3xl outline-1 outline-amber-200/60 dark:outline-amber-900/40 flex items-center gap-3 animate-fade-up">
      <div className="size-10 rounded-2xl bg-amber-400/20 dark:bg-amber-500/20 grid place-items-center text-amber-600 dark:text-amber-300">
        <Award className="size-5" aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Hari paling konsisten: {dayName}</p>
        <p className="text-[11px] text-muted-foreground">
          {best.meals} log makanan · {Math.round(best.calories)} kkal. Tetap pertahankan ritme ini
          ya!
        </p>
      </div>
    </section>
  );
}
