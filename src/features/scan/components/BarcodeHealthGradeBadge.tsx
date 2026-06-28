import { cn } from "@/lib/utils";
import { Apple, Award } from "lucide-react";
import type { BarcodeHealthGrade } from "@/features/scan/lib/barcodeHealthScore";

/**
 * Sprint 27 — Indonesian Nutritrack-style grade badge (A-E).
 *
 * Mirrors the visual shape of `ConfidenceBadge` (high/medium/low) so the two
 * grades live next to each other without visual conflict on the same product
 * card. Color tone follows the same emotion curve:
 *   - A/B → success (recommended)
 *   - C   → warning (neutral / occasional)
 *   - D/E → error (avoid regularly)
 *
 * Truthful UX: when `reliable:false`, the spec says "data tidak cukup" — the
 * grade is shown but de-emphasised so users don't over-trust a fragmented
 * grade computed from one or two nutrient fields.
 */
const STYLE: Record<BarcodeHealthGrade["grade"], { cls: string; tone: string; desc: string }> = {
  A: {
    cls: "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
    tone: "Sangat baik",
    desc: "Pilihan utama — rendah gula/sodium, kaya protein/serat.",
  },
  B: {
    cls: "bg-lime-500/15 border-lime-500/30 text-lime-700 dark:text-lime-300",
    tone: "Baik",
    desc: "Oke setiap hari dalam porsi wajar.",
  },
  C: {
    cls: "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300",
    tone: "Cukup",
    desc: "Sekali-sekali boleh, jangan rutin.",
  },
  D: {
    cls: "bg-orange-500/15 border-orange-500/30 text-orange-700 dark:text-orange-300",
    tone: "Kurangi",
    desc: "Sebaiknya dihindari sebagai cemilan.",
  },
  E: {
    cls: "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300",
    tone: "Hindari",
    desc: "Gula/lemak/sodium tinggi — pilih alternatif.",
  },
};

export function BarcodeHealthGradeBadge({
  grade,
  reliable,
  reasons,
  className = "",
}: {
  grade: BarcodeHealthGrade;
  reliable?: boolean;
  reasons?: string[];
  className?: string;
}) {
  const s = STYLE[grade.grade];
  return (
    <div
      className={cn(
        "rounded-2xl border p-3 space-y-2",
        s.cls,
        !reliable && "opacity-80",
        className,
      )}
      aria-label={`Grade kesehatan ${grade.grade}, ${s.tone}`}
    >
      <div className="flex items-center gap-3">
        <div
          className="size-12 shrink-0 grid place-items-center rounded-xl bg-background/50 font-bold text-2xl tabular-nums"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {grade.grade}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider opacity-80">
            <Award className="size-3" /> Grade Nutrisi
          </div>
          <p className="font-semibold text-sm leading-tight">{s.tone}</p>
          {!reliable ? (
            <p className="text-[10px] opacity-70 mt-0.5">⚠️ Data nutrisi tidak lengkap</p>
          ) : (
            <p className="text-[10px] opacity-80 mt-0.5 tabular-nums">{grade.score}/100</p>
          )}
        </div>
      </div>
      <p className="text-[11px] leading-snug opacity-90">{s.desc}</p>
      {reasons && reasons.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {reasons.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-background/40"
            >
              <Apple className="size-2.5" /> {r}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
