import { Lightbulb, TrendingUp, AlertCircle, Check } from "lucide-react";
import type { ReactNode } from "react";

type InsightTone = "tip" | "achievement" | "warning" | "neutral";

const TONE_STYLES: Record<InsightTone, { bg: string; text: string; Icon: typeof Lightbulb }> = {
  tip: {
    bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900",
    text: "text-blue-900 dark:text-blue-100",
    Icon: Lightbulb,
  },
  achievement: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900",
    text: "text-emerald-900 dark:text-emerald-100",
    Icon: Check,
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900",
    text: "text-amber-900 dark:text-amber-100",
    Icon: AlertCircle,
  },
  neutral: {
    bg: "bg-secondary/40 border-border/50",
    text: "text-foreground",
    Icon: TrendingUp,
  },
};

/**
 * TodayInsight — Auto-generated daily insight.
 *
 * Decides what to surface based on user state:
 *  - Over/under calorie target
 *  - Hydration gap
 *  - Macro balance warning
 *  - Streak milestone
 *  - Or generic tip
 */
export type InsightContext = {
  totals: { cal: number; p: number; c: number; f: number };
  calTarget: number;
  waterMl: number;
  waterTarget: number;
  streak: number;
  mealsCount: number;
};

export function TodayInsight({ ctx }: { ctx: InsightContext }): ReactNode {
  const { totals, calTarget, waterMl, waterTarget, streak, mealsCount } = ctx;
  const overKcal = totals.cal - calTarget;
  const waterPct = waterMl / waterTarget;
  const proteinPct = totals.p / 60;
  const remainingKcal = calTarget - totals.cal;

  // 1. Achievement: big streak
  if (streak >= 7 && streak % 7 === 0 && streak > 0) {
    return (
      <InsightCard
        tone="achievement"
        title={`Streak ${streak} hari! 🎉`}
        body={`Konsistensi kamu luar biasa. ${streak} hari berturut-turut sudah terlewati.`}
      />
    );
  }

  // 2. Warning: significantly over calorie target
  if (overKcal > calTarget * 0.15) {
    return (
      <InsightCard
        tone="warning"
        title="Kalori agak lewat target"
        body="Tidak apa-apa — besok pilih protein & sayur lebih banyak. Keseimbangan, bukan hukuman."
      />
    );
  }

  // 3. Warning: very low water
  if (waterPct < 0.3 && new Date().getHours() > 14) {
    return (
      <InsightCard
        tone="warning"
        title="Waktu minum air!"
        body={`Baru ${waterMl}ml dari target ${waterTarget}ml. Bawa botol air ke mana-mana.`}
      />
    );
  }

  // 4. Tip: low protein
  if (proteinPct < 0.3 && mealsCount >= 2) {
    return (
      <InsightCard
        tone="tip"
        title="Protein masih kurang"
        body="Tambah lauk berprotein di makan berikutnya: telur, tempe, ayam, atau ikan."
      />
    );
  }

  // 5. Tip: no meals logged but it's late
  if (mealsCount === 0 && new Date().getHours() > 14) {
    return (
      <InsightCard
        tone="tip"
        title="Belum ada catatan hari ini"
        body="Mulai dengan satu makanan ringan. Apapun itu, yang penting mulai."
      />
    );
  }

  // 6. Achievement: ahead of calorie target
  if (remainingKcal > 0 && remainingKcal < calTarget * 0.3 && totals.cal > 0) {
    return (
      <InsightCard
        tone="achievement"
        title="Hampir capai target kalori"
        body={`Tinggal ${Math.round(remainingKcal)} kkal lagi. Pilih makanan ringan & bergizi.`}
      />
    );
  }

  // 7. Neutral: hydration is on track
  if (waterPct >= 0.7) {
    return (
      <InsightCard
        tone="neutral"
        title="Hidrasi on track"
        body={`${waterMl}ml sudah masuk. Lanjutkan minum air setiap jam ya.`}
      />
    );
  }

  return null;
}

function InsightCard({ tone, title, body }: { tone: InsightTone; title: string; body: string }) {
  const style = TONE_STYLES[tone];
  const Icon = style.Icon;
  return (
    <div
      className={`flex items-start gap-3 p-3.5 rounded-2xl border ${style.bg} ${style.text} animate-fade-up`}
    >
      <div className="size-8 rounded-lg bg-white/60 dark:bg-black/20 grid place-items-center shrink-0">
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug">{title}</p>
        <p className="text-[12px] mt-0.5 leading-relaxed opacity-80">{body}</p>
      </div>
    </div>
  );
}
