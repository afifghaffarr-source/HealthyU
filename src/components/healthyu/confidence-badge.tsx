import { CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import { type ConfidenceTier, tierFromScore } from "./confidence-badge.utils";

export type { ConfidenceTier };

const STYLE: Record<ConfidenceTier, { label: string; Icon: typeof CheckCircle2; cls: string }> = {
  high: {
    label: "Tinggi",
    Icon: CheckCircle2,
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  medium: {
    label: "Sedang",
    Icon: HelpCircle,
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  low: {
    label: "Perlu cek",
    Icon: AlertCircle,
    cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
};

export function ConfidenceBadge({
  score,
  className = "",
}: {
  score: number | null | undefined;
  className?: string;
}) {
  const tier = tierFromScore(score);
  const { label, Icon, cls } = STYLE[tier];
  const pct = Math.round(Number(score ?? 0) * 100);
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${cls} ${className}`}
      aria-label={`Keyakinan AI ${label}, ${pct} persen`}
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  );
}
