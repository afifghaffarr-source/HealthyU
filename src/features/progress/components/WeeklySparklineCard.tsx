import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { weekMealStats } from "@/features/meals/lib/meals.functions";
import { TrendingUp } from "lucide-react";

const DAY_LABEL = ["M", "S", "S", "R", "K", "J", "S"];

function dayLetter(iso: string) {
  const d = new Date(iso);
  return DAY_LABEL[d.getDay()];
}

export function WeeklySparklineCard({ calTarget }: { calTarget: number }) {
  const fetch = useServerFn(weekMealStats);
  const { data: days = [] } = useQuery({
    queryKey: ["meals", "week-stats"],
    queryFn: () => fetch(),
    staleTime: 1000 * 60 * 5,
  });

  if (!days.length) return null;
  const max = Math.max(calTarget, ...days.map((d) => d.calories), 1);
  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 dark:outline-white/10 space-y-3 animate-fade-up">
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-xl bg-primary/10 grid place-items-center text-primary">
          <TrendingUp className="size-4" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold">Tren 7 hari</p>
          <p className="text-[11px] text-muted-foreground">
            Kalori per hari · target {calTarget} kkal
          </p>
        </div>
      </div>
      <div className="flex items-end gap-1.5 h-24">
        {days.map((d) => {
          const h = Math.max(4, Math.round((d.calories / max) * 100));
          const isToday = d.date === todayKey;
          const onTrack = d.calories > 0 && d.calories <= calTarget * 1.05;
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex-1 flex items-end">
                <div
                  className={`w-full rounded-md transition-all ${
                    d.calories === 0
                      ? "bg-muted"
                      : onTrack
                        ? "bg-primary"
                        : "bg-amber-400/70 dark:bg-amber-500/60"
                  } ${isToday ? "ring-2 ring-primary/40" : ""}`}
                  style={{ height: `${h}%` }}
                  aria-label={`${d.date}: ${d.calories} kkal`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{dayLetter(d.date)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}