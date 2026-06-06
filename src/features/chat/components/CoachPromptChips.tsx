import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const updateState = () => {
      const maxScrollLeft = Math.max(scroller.scrollWidth - scroller.clientWidth, 0);
      const cardStep = 208;
      setCanScrollPrev(scroller.scrollLeft > 8);
      setCanScrollNext(scroller.scrollLeft < maxScrollLeft - 8);
      setActiveIndex(Math.max(0, Math.min(prompts.length - 1, Math.round(scroller.scrollLeft / cardStep))));
    };

    updateState();
    scroller.addEventListener("scroll", updateState, { passive: true });
    const observer = new ResizeObserver(updateState);
    observer.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", updateState);
      observer.disconnect();
    };
  }, [prompts.length]);

  const scrollCards = (direction: "prev" | "next") => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const distance = Math.max(scroller.clientWidth * 0.82, 180);
    scroller.scrollBy({
      left: direction === "next" ? distance : -distance,
      behavior: "smooth",
    });
  };

  return (
    <div className="space-y-2">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-gradient-to-r from-background via-background/90 to-transparent"
        aria-hidden="true"
      />
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background via-background/90 to-transparent"
          aria-hidden="true"
        />
        <div
          ref={scrollerRef}
          className="-mx-1 flex gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain px-1 pr-8 pb-1 pt-1 snap-x snap-mandatory no-scrollbar [scrollbar-width:none]"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x", scrollPaddingLeft: "0.25rem" }}
          role="group"
          aria-label="Ide pertanyaan untuk AI Coach"
        >
          {prompts.map((p, index) => (
            <button
              key={p}
              type="button"
              onClick={() => onPick(p)}
              disabled={disabled}
              className="snap-start min-h-[4.75rem] w-[12.5rem] shrink-0 select-none rounded-[1.4rem] border border-border/70 bg-card/95 px-3.5 py-3 text-left text-[13px] font-medium leading-5 shadow-sm transition hover:bg-secondary/45 disabled:opacity-50"
              aria-label={`Saran cepat ${index + 1}: ${p}`}
            >
              <span className="line-clamp-2 block text-foreground">{p}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-1.5" aria-label="Posisi saran cepat">
          {prompts.map((prompt, index) => (
            <span
              key={prompt}
              className={`block h-1.5 rounded-full transition-all ${
                index === activeIndex ? "w-5 bg-primary" : "w-1.5 bg-border"
              }`}
              aria-hidden="true"
            />
          ))}
          <span className="pl-1 text-[11px] text-muted-foreground">
            {activeIndex + 1}/{prompts.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollCards("prev")}
            disabled={!canScrollPrev || disabled}
            className="grid size-8 place-items-center rounded-full border border-border/70 bg-card text-foreground shadow-sm transition hover:bg-secondary/45 disabled:opacity-35"
            aria-label="Geser saran ke kiri"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollCards("next")}
            disabled={!canScrollNext || disabled}
            className="grid size-8 place-items-center rounded-full border border-border/70 bg-card text-foreground shadow-sm transition hover:bg-secondary/45 disabled:opacity-35"
            aria-label="Geser saran ke kanan"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}