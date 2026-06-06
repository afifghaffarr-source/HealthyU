import { Sparkles } from "lucide-react";

/**
 * Friendly, non-judgmental macro-gap insight. Surfaces the macro that's
 * most behind (relative to a simple 30/40/30 P/C/F split of the calorie
 * target) and suggests practical, locally-relevant foods.
 */
export function MacroGapInsightCard({
  totals,
  calTarget,
}: {
  totals: { cal: number; p: number; c: number; f: number };
  calTarget: number;
}) {
  // Only show after the user has logged something today.
  if (totals.cal <= 0) return null;

  const pTarget = Math.round((calTarget * 0.3) / 4);
  const cTarget = Math.round((calTarget * 0.4) / 4);
  const fTarget = Math.round((calTarget * 0.3) / 9);

  const gaps = [
    { k: "p" as const, label: "Protein", gap: pTarget - totals.p, target: pTarget },
    { k: "c" as const, label: "Karbohidrat", gap: cTarget - totals.c, target: cTarget },
    { k: "f" as const, label: "Lemak sehat", gap: fTarget - totals.f, target: fTarget },
  ];
  const worst = gaps.reduce((a, b) => (b.gap > a.gap ? b : a));
  // Nothing meaningfully missing.
  if (worst.gap <= 5) return null;

  const ideas: Record<typeof worst.k, string> = {
    p: "Coba telur rebus, tahu/tempe bacem, dada ayam, atau yogurt plain.",
    c: "Coba nasi merah, ubi rebus, oatmeal, atau pisang.",
    f: "Coba alpukat, kacang almond, atau ikan kembung.",
  };

  return (
    <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 dark:outline-white/10 animate-fade-up">
      <div className="flex items-start gap-3">
        <span
          className="size-9 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0"
          aria-hidden
        >
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">
            {worst.label} masih kurang{" "}
            <span className="tabular-nums">~{Math.round(worst.gap)}g</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ideas[worst.k]}</p>
        </div>
      </div>
    </section>
  );
}
