const DEFAULT_PROMPTS = [
  "Protein saya kurang, makan apa?",
  "Ide menu warung yang lebih sehat",
  "Bantu evaluasi hari ini",
  "Makan malam ringan apa?",
  "Saya lewat target, harus bagaimana?",
];

function buildPersonalizedPrompts({
  hour,
  remainingKcal,
  proteinGap,
}: {
  hour?: number;
  remainingKcal?: number;
  proteinGap?: number;
}): string[] {
  const out: string[] = [];
  if (typeof hour === "number") {
    if (hour >= 6 && hour < 10) out.push("Ide sarapan praktis < 400 kkal?");
    else if (hour >= 11 && hour < 14) out.push("Menu makan siang seimbang warung apa?");
    else if (hour >= 17 && hour < 21) out.push("Makan malam ringan tinggi protein?");
    else if (hour >= 21) out.push("Camilan malam yang tidak ganggu tidur?");
  }
  if (typeof proteinGap === "number" && proteinGap > 15) {
    out.push(`Protein kurang ~${Math.round(proteinGap)}g, makan apa?`);
  }
  if (typeof remainingKcal === "number") {
    if (remainingKcal < 0) out.push("Saya lewat target, gimana atur besok?");
    else if (remainingKcal > 0 && remainingKcal < 400)
      out.push(`Sisa ~${Math.round(remainingKcal)} kkal, ide makan apa?`);
  }
  // Always keep a couple of evergreen prompts as fallbacks.
  for (const p of DEFAULT_PROMPTS) {
    if (out.length >= 5) break;
    if (!out.includes(p)) out.push(p);
  }
  return out.slice(0, 5);
}

export function CoachPromptChips({
  onPick,
  disabled,
  hour,
  remainingKcal,
  proteinGap,
}: {
  onPick: (text: string) => void;
  disabled: boolean;
  hour?: number;
  remainingKcal?: number;
  proteinGap?: number;
}) {
  const prompts = buildPersonalizedPrompts({ hour, remainingKcal, proteinGap });

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-gradient-to-r from-background via-background/90 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background via-background/90 to-transparent"
        aria-hidden="true"
      />
      <div
        className="-mx-1 flex gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain px-1 pr-6 pb-1 pt-1 snap-x snap-mandatory no-scrollbar [scrollbar-width:none]"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
        role="group"
        aria-label="Ide pertanyaan untuk AI Coach"
      >
        {prompts.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPick(p)}
            disabled={disabled}
            className="snap-start min-h-[4.5rem] w-[12.5rem] shrink-0 select-none rounded-[1.4rem] border border-border/70 bg-card/95 px-3.5 py-3 text-left text-[13px] font-medium leading-5 shadow-sm transition hover:bg-secondary/45 disabled:opacity-50"
          >
            <span className="line-clamp-2 block text-foreground">{p}</span>
          </button>
        ))}
      </div>
    </div>
  );
}