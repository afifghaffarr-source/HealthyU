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
    <div
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 snap-x"
      role="group"
      aria-label="Ide pertanyaan untuk AI Coach"
    >
      {prompts.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPick(p)}
          disabled={disabled}
          className="snap-start shrink-0 w-[12.5rem] rounded-2xl border border-border/60 bg-card px-3.5 py-3 text-left text-xs font-medium leading-4 hover:bg-secondary/40 transition disabled:opacity-50"
        >
          <span className="line-clamp-2 block">{p}</span>
        </button>
      ))}
    </div>
  );
}