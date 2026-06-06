import { Droplet } from "lucide-react";

export function HydrationSuggestCard({
  waterMl,
  targetMl,
  hour,
  onLog,
  disabled,
}: {
  waterMl: number;
  targetMl: number;
  hour: number;
  onLog: (ml: number) => void;
  disabled?: boolean;
}) {
  // Expected intake by hour of day (linear from 7am to 9pm)
  const start = 7;
  const end = 21;
  if (hour < start || hour > end) return null;
  const progress = Math.min(1, Math.max(0, (hour - start) / (end - start)));
  const expected = Math.round(targetMl * progress);
  const deficit = expected - waterMl;
  if (deficit < 400) return null;

  const suggest = Math.min(500, Math.round(deficit / 100) * 100);
  return (
    <section className="bg-card p-4 rounded-3xl outline-1 outline-sky-200/60 dark:outline-sky-900/40 flex items-center gap-3 animate-fade-up">
      <div className="size-10 rounded-2xl bg-sky-100 dark:bg-sky-950 grid place-items-center text-sky-600 dark:text-sky-300">
        <Droplet className="size-5" aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Saatnya minum air</p>
        <p className="text-[11px] text-muted-foreground">
          Kamu sekitar {(deficit / 1000).toFixed(1)}L di belakang ritme harian. Tambah {suggest}ml?
        </p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onLog(suggest)}
        className="bg-sky-600 text-white text-xs font-semibold px-3 py-2 rounded-xl min-h-11 disabled:opacity-50"
      >
        + {suggest}ml
      </button>
    </section>
  );
}
