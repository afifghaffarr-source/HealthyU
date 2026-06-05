export function WeeklyChart({
  byDay,
  maxCal,
}: {
  byDay: Array<{ day: string; cals: number }>;
  maxCal: number;
}) {
  return (
    <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 animate-fade-up">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
        Kalori harian
      </p>
      <div className="flex items-end gap-2 h-32">
        {byDay.map((d) => (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex-1 w-full flex items-end">
              <div
                className="w-full bg-primary rounded-t-md transition-all"
                style={{
                  height: `${(d.cals / maxCal) * 100}%`,
                  minHeight: d.cals > 0 ? "4px" : 0,
                }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground tabular-nums">
              {new Date(d.day).toLocaleDateString("id-ID", { weekday: "narrow" })}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}