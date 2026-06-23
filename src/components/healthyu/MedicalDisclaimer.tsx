/**
 * MedicalDisclaimer — visible chip shown on AI-generated surfaces.
 *
 * Re-uses the SafetyChip visual language but is purpose-built for medical
 * disclaimer (not "AI estimate" — those are different signals).
 *
 * Variants:
 * - `disclaimer`: standard "Saran umum, bukan saran medis" chip.
 * - `crisis`: red hotline banner for crisis responses.
 * - `ed`: orange ED-aware resources chip.
 * - `dangerous`: rose blocked-behavior banner.
 */

import { ShieldAlert, Stethoscope, AlertOctagon, Phone } from "lucide-react";

type Variant = "disclaimer" | "crisis" | "ed" | "dangerous";

const COPY: Record<
  Variant,
  {
    text: string;
    Icon: typeof Stethoscope;
    bg: string;
    fg: string;
    role: "note" | "alert";
  }
> = {
  disclaimer: {
    text: "Saran umum, bukan saran medis. Konsultasikan dengan tenaga kesehatan untuk keputusan klinis.",
    Icon: Stethoscope,
    bg: "bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40",
    fg: "text-amber-900 dark:text-amber-200",
    role: "note",
  },
  crisis: {
    text: "⚠️ Hotline krisis 24 jam: Into The Light (intothelightid.org) · Kemenkes 119 ext 8 · Yayasan Pulih (021) 78842580",
    Icon: Phone,
    bg: "bg-red-50 dark:bg-red-950/30 border border-red-300/60 dark:border-red-800/40",
    fg: "text-red-900 dark:text-red-100",
    role: "alert",
  },
  ed: {
    text: "🍽️ Jika kamu berjuang dengan pola makan/beban tubuh, bicaralah dengan psikolog/ahli gizi berpengalaman gangguan makan.",
    Icon: ShieldAlert,
    bg: "bg-orange-50 dark:bg-orange-950/30 border border-orange-200/60 dark:border-orange-800/40",
    fg: "text-orange-900 dark:text-orange-200",
    role: "alert",
  },
  dangerous: {
    text: "Untuk kesehatanmu, kami tidak mendukung praktik ini. Hubungi ahli gizi/psikolog untuk bantuan aman.",
    Icon: AlertOctagon,
    bg: "bg-rose-50 dark:bg-rose-950/30 border border-rose-300/60 dark:border-rose-800/40",
    fg: "text-rose-900 dark:text-rose-100",
    role: "alert",
  },
};

export function MedicalDisclaimer({
  variant = "disclaimer",
  className = "",
  compact = false,
}: {
  variant?: Variant;
  className?: string;
  /** Compact pill (chip-shaped) vs full-width banner. */
  compact?: boolean;
}) {
  const { text, Icon, bg, fg, role } = COPY[variant];
  return (
    <div
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
      className={
        compact
          ? `inline-flex items-center gap-1.5 text-[12px] leading-snug rounded-full px-3 py-1.5 ${bg} ${fg} ${className}`
          : `flex items-start gap-2 text-[13px] leading-snug rounded-lg px-3 py-2 ${bg} ${fg} ${className}`
      }
    >
      <Icon className="size-3.5 shrink-0 mt-0.5" aria-hidden />
      <span>{text}</span>
    </div>
  );
}
