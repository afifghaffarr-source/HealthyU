import { CalorieRing } from "@/components/calorie-ring";

export function TodaysBalanceCard({
  totals,
  calTarget,
}: {
  totals: { cal: number; p: number; c: number; f: number };
  calTarget: number;
}) {
  const remaining = calTarget - totals.cal;
  const over = remaining < 0;
  const proteinTarget = Math.round((calTarget * 0.3) / 4);
  const proteinGap = Math.max(0, proteinTarget - Math.round(totals.p));
  // Granular over-target tones: slight (≤10% over) → amber soft,
  // notable (10–20%) → amber, large (>20%) → rose. Never shaming.
  const overPct = over ? Math.abs(remaining) / Math.max(1, calTarget) : 0;
  const overBanner = !over
    ? null
    : overPct <= 0.1
      ? {
          tone: "bg-amber-50/70 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100",
          msg: "Sedikit lewat target — tetap aman. Jaga ritme di sesi berikutnya.",
        }
      : overPct <= 0.2
        ? {
            tone: "bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100",
            msg: "Hari ini agak lewat target. Pilih protein & sayur di waktu berikutnya, itu cukup.",
          }
        : {
            tone: "bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100",
            msg: "Cukup lewat target hari ini — tidak apa-apa. Besok kita bantu seimbangkan, bukan menghukum.",
          };

  return (
    <section
      aria-label="Saldo kalori hari ini"
      className="bg-card rounded-3xl outline-1 outline-black/5 dark:outline-white/10 shadow-sm p-5 animate-fade-up"
    >
      <div className="flex items-center gap-4">
        <CalorieRing
          consumed={totals.cal}
          target={calTarget}
          size={132}
          macros={{ protein: totals.p, carbs: totals.c, fat: totals.f }}
        />
        <div className="flex-1 min-w-0 space-y-1">
          <p
            className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Hari ini
          </p>
          <p className="text-2xl font-bold tabular-nums leading-none">
            {Math.round(Math.abs(remaining))}
            <span className="text-sm font-medium text-muted-foreground ml-1">kkal</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {over ? "Lewat target" : "Tersisa untuk hari ini"}
          </p>
          {proteinGap > 0 && !over && (
            <p className="text-[11px] text-muted-foreground pt-1">
              Protein masih{" "}
              <span className="font-semibold text-foreground tabular-nums">-{proteinGap}g</span>
            </p>
          )}
        </div>
      </div>
      {overBanner && (
        <div className={`mt-4 p-3 rounded-2xl text-[12px] leading-relaxed ${overBanner.tone}`}>
          {overBanner.msg}
        </div>
      )}
    </section>
  );
}
