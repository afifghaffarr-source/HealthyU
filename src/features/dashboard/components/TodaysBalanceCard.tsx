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
      {over && (
        <div className="mt-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-[12px] leading-relaxed text-amber-900 dark:text-amber-100">
          Sedikit lewat target hari ini — tidak apa-apa. Kita bantu seimbangkan besok dengan
          pilihan tinggi protein & sayur.
        </div>
      )}
    </section>
  );
}