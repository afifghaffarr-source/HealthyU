import { Clock, MoonStar, Droplet, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sprint 29 — Puasa Aman Mode widget.
 *
 * Mounted anywhere fasts happen — `/fasting` route and dashboard hero
 * when `inRamadhanMode || activeFast`. Whole widget is purely presentational;
 * the server fn already did the math. Visual style mirrors the existing
 * `RamadhanScheduleCard` and `ActiveFastCard` in the same family.
 */

interface WidgetPayload {
  iftar: { minutesUntil: number; label: string };
  sahur: { minutesUntil: number; label: string };
  nudge: { kind: string; copy: string; priority: number };
  activeFast: boolean;
  inRamadhanMode: boolean;
  elapsedHours: number;
  targetHours: number;
}

export function PuasaAmanWidget({ data }: { data: WidgetPayload }) {
  if (!data.activeFast && !data.inRamadhanMode) return null;

  const minutes = data.iftar.minutesUntil;
  const hours = Math.floor(minutes / 60);
  const m = minutes - hours * 60;
  const ring = Math.max(0, Math.min(100, 100 - (minutes / (24 * 60)) * 100));

  const isPriority = data.nudge.priority >= 2;

  return (
    <section
      className={cn(
        "rounded-3xl border p-4 space-y-3",
        isPriority
          ? "bg-amber-500/10 border-amber-500/40"
          : "bg-emerald-500/10 border-emerald-500/30",
      )}
      data-testid="puasa-aman-widget"
    >
      <div className="flex items-center gap-2 text-sm">
        <MoonStar className="size-4 text-emerald-700 dark:text-emerald-300" />
        <span className="font-semibold">Puasa Aman</span>
        {data.inRamadhanMode && (
          <span className="ml-auto text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/30">
            Ramadhan
          </span>
        )}
      </div>

      {/* Buka-puasa countdown ring + hours/minutes */}
      <div className="flex items-center gap-4">
        <div className="relative size-20 shrink-0">
          <svg viewBox="0 0 36 36" className="-rotate-90 block size-full">
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              strokeWidth="3"
              className="stroke-emerald-500/20"
            />
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              strokeWidth="3"
              strokeDasharray={`${ring} 100`}
              strokeLinecap="round"
              className="stroke-emerald-500 transition-[stroke-dasharray] duration-700"
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className="text-sm font-bold tabular-nums">
              {data.activeFast ? `${hours}:${m.toString().padStart(2, "0")}` : "—"}
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" /> Menuju Berbuka
          </div>
          <p className="text-sm font-semibold leading-tight truncate">{data.iftar.label}</p>
          {data.activeFast && (
            <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
              Berjalan {data.elapsedHours.toFixed(1)}j · target {data.targetHours}j
            </p>
          )}
        </div>
      </div>

      {/* Safe-fasting nudge — humane-tone copy */}
      <div className="rounded-xl bg-background/50 p-3 flex items-start gap-2">
        <Droplet className="size-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
        <p className="text-xs leading-snug flex-1">{data.nudge.copy}</p>
      </div>

      {/* Sahur reverse-countdown (subtle, ramadhan-only) */}
      {data.inRamadhanMode && data.sahur.minutesUntil > 0 && (
        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Heart className="size-3" /> {data.sahur.label}
        </div>
      )}
    </section>
  );
}
