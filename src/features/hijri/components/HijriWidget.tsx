/**
 * HijriWidget — displays today's Hijri date + countdown to 1 Ramadhan 1448 H.
 *
 * Two variants:
 *   - "compact": small card suitable for dashboards / sidebars
 *   - "feature": larger card with countdown progress bar, suitable for
 *               landing pages
 *
 * Renders client-only to avoid SSR/CSR hydration mismatch (moment-hijri
 * uses `new Date()` which may differ by hours between server render and
 * first client paint).
 */
import { useEffect, useState } from "react";
import { CalendarDays, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getHijriFormatted, getRamadhanCountdown } from "@/features/hijri/lib/hijri";

interface HijriWidgetProps {
  variant?: "compact" | "feature";
  className?: string;
}

export function HijriWidget({ variant = "compact", className }: HijriWidgetProps) {
  // Avoid SSR/CSR mismatch — moment-hijri reads `new Date()` and the server
  // and client clocks can disagree across day boundaries.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Reserve roughly the same vertical space as the rendered card so the
    // page doesn't jump after hydration.
    return (
      <div
        aria-hidden
        className={cn(
          "rounded-2xl bg-white border border-stone-200",
          variant === "feature" ? "p-6 lg:p-8 min-h-[180px]" : "p-4 min-h-[110px]",
          className,
        )}
      />
    );
  }

  const { hijri, gregorian, dayName } = getHijriFormatted();
  const countdown = getRamadhanCountdown();

  if (variant === "feature") {
    return (
      <div className={cn("rounded-3xl bg-white border border-stone-200 p-6 lg:p-8", className)}>
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-stone-500">
          <CalendarDays className="size-3.5" strokeWidth={2} />
          <span>Tanggal Hijriah</span>
        </div>

        <div className="mt-4">
          <div
            className="text-3xl lg:text-4xl font-semibold text-stone-900 tabular-nums"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {hijri}
          </div>
          <div className="mt-1 text-sm text-stone-600">
            {dayName}, {gregorian}
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-stone-200">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-stone-500">
            <Moon className="size-3.5" strokeWidth={2} />
            <span>Puasa Ramadhan</span>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <span
              className="text-4xl font-bold text-amber-700 tabular-nums"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {countdown.days}
            </span>
            <span className="text-base text-stone-700">hari lagi</span>
          </div>
          <div className="mt-1 text-sm text-stone-600">
            Menuju 1 Ramadhan 1448 H · {countdown.humanized.replace(" lagi", "")}
          </div>

          {/* Progress bar: 354-day Ramadhan cycle reference.
              When days=0 we're at 1 Ramadhan. After that, cycles reset. */}
          <div
            className="mt-4 h-1.5 w-full bg-stone-100 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={354}
            aria-valuenow={countdown.isToday ? 0 : Math.min(countdown.days, 354)}
            aria-label={`${countdown.days} hari menuju Ramadhan 1448 H`}
          >
            <div
              className="h-full bg-amber-700 transition-all duration-500"
              style={{
                width: `${countdown.isToday ? 100 : Math.max(2, 100 - (countdown.days / 354) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // compact
  return (
    <div className={cn("rounded-2xl bg-white border border-stone-200 p-4", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wide">
          Hijriah
        </span>
        <Moon className="size-3.5 text-amber-700" strokeWidth={2} />
      </div>
      <div
        className="text-lg font-semibold text-stone-900 tabular-nums"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {hijri}
      </div>
      <div className="text-xs text-stone-600 mt-0.5">
        {dayName}, {gregorian}
      </div>
      {countdown.isToday ? (
        <div className="mt-2 text-xs font-medium text-amber-700">
          🌙 Ramadhan 1448 H dimulai hari ini
        </div>
      ) : (
        <div className="mt-2 text-xs text-stone-700">
          <span className="font-semibold tabular-nums">{countdown.days}</span> hari lagi menuju
          Ramadhan
        </div>
      )}
    </div>
  );
}
