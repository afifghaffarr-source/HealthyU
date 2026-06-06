import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart } from "lucide-react";
import { getMood7Day } from "@/features/wellness/lib/wellness.functions";
import { cn } from "@/lib/utils";

const EMOJI = ["", "😢", "😕", "😐", "🙂", "😄"] as const;
const DAY_LABEL = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function MoodTrend7DayCard() {
  const fetch7 = useServerFn(getMood7Day);
  const { data } = useQuery({
    queryKey: ["mood-7day"],
    queryFn: () => fetch7(),
    staleTime: 5 * 60_000,
  });

  const days = data?.days ?? [];
  const overall = data?.overall ?? null;
  const loggedCount = data?.daysLogged ?? 0;

  return (
    <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 shadow-sm animate-fade-up">
      <header className="flex items-center gap-2 mb-3">
        <div className="size-10 rounded-2xl bg-rose-100 dark:bg-rose-950/40 grid place-items-center">
          <Heart className="size-5 text-rose-600 dark:text-rose-300" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm">Mood 7 hari</h3>
          <p className="text-xs text-muted-foreground">
            {loggedCount === 0
              ? "Belum ada catatan mood minggu ini."
              : `Rata-rata ${overall?.toFixed(1)} · ${loggedCount}/7 hari tercatat`}
          </p>
        </div>
        {overall !== null ? (
          <div className="text-2xl" aria-hidden="true">
            {EMOJI[Math.round(overall)] ?? ""}
          </div>
        ) : null}
      </header>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const date = new Date(d.date + "T00:00:00");
          const dow = date.getDay();
          const isToday = new Date().toISOString().slice(0, 10) === d.date;
          const heightPct = d.avg !== null ? Math.max(15, (d.avg / 5) * 100) : 6;
          const colorClass =
            d.avg === null
              ? "bg-muted"
              : d.avg >= 4
                ? "bg-emerald-400"
                : d.avg >= 3
                  ? "bg-amber-400"
                  : "bg-rose-400";
          return (
            <div key={d.date} className="flex flex-col items-center gap-1">
              <div className="h-16 w-full rounded-md bg-muted/40 flex items-end overflow-hidden">
                <div
                  className={cn(
                    "w-full transition-all rounded-md",
                    colorClass,
                    isToday && "ring-2 ring-primary ring-offset-1 ring-offset-card",
                  )}
                  style={{ height: `${heightPct}%` }}
                  aria-label={
                    d.avg !== null
                      ? `${DAY_LABEL[dow]}: mood ${d.avg}`
                      : `${DAY_LABEL[dow]}: belum tercatat`
                  }
                />
              </div>
              <span
                className={cn(
                  "text-[10px] tabular-nums",
                  isToday ? "font-bold text-primary" : "text-muted-foreground",
                )}
              >
                {DAY_LABEL[dow]}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
