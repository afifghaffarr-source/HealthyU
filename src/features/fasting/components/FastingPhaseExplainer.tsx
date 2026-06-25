import { Droplet, Zap, Flame } from "lucide-react";

type Phase = {
  icon: typeof Droplet;
  label: string;
  hours: string;
  desc: string;
  color: string;
};

const PHASES: Phase[] = [
  {
    icon: Droplet,
    label: "Fed state",
    hours: "0-4 jam",
    desc: "Tubuh pakai glukosa dari makanan sebagai energi utama.",
    color: "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300",
  },
  {
    icon: Zap,
    label: "Glycogen depletion",
    hours: "4-12 jam",
    desc: "Cadangan glikogen mulai habis, tubuh beralih ke lemak.",
    color: "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
  },
  {
    icon: Flame,
    label: "Fat burning",
    hours: "12-16+ jam",
    desc: "Tubuh bakar lemak jadi energi (ketosis ringan). Ini fase yang umumnya dicari.",
    color: "bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300",
  },
];

/**
 * Phase 3 (8.6): Educational explainer showing fasting phases.
 * Helps users understand what's happening during their fast.
 */
export function FastingPhaseExplainer({ currentHours }: { currentHours?: number }) {
  return (
    <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 dark:outline-white/10 space-y-3 animate-fade-up">
      <div>
        <h3 className="text-sm font-bold">Fase puasa</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Apa yang terjadi saat kamu puasa (panduan umum, bukan medis)
        </p>
      </div>
      <div className="space-y-2">
        {PHASES.map((phase, idx) => {
          const Icon = phase.icon;
          const isActive =
            currentHours !== undefined &&
            ((idx === 0 && currentHours < 4) ||
              (idx === 1 && currentHours >= 4 && currentHours < 12) ||
              (idx === 2 && currentHours >= 12));
          return (
            <div
              key={phase.label}
              className={`p-3 rounded-2xl flex items-start gap-3 transition ${
                isActive ? phase.color : "bg-muted/40 dark:bg-muted/20 text-muted-foreground"
              }`}
            >
              <span
                className={`size-9 shrink-0 rounded-xl grid place-items-center ${
                  isActive ? "bg-background/60" : "bg-background/40"
                }`}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="text-xs font-bold">{phase.label}</p>
                  <p className="text-[10px] opacity-70">{phase.hours}</p>
                </div>
                <p className="text-[11px] mt-0.5 leading-snug opacity-90">{phase.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground px-1 pt-1">
        💧 Tetap minum air putih selama puasa. Dehidrasi bukan tujuan.
      </p>
    </section>
  );
}
