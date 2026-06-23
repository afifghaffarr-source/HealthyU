import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight, Sun, Moon, Check } from "lucide-react";

type CoachKind = "morning" | "evening";

/**
 * CoachCard — Dashboard preview card for AI Coach.
 *
 * Shows a small summary of today's coach session (focus + 1 tip)
 * with a "buka" link to /coach. Tapping marks the card as "seen".
 */
export function CoachCard({
  kind,
  greeting,
  focus,
  oneTip,
  hasRead,
  onMarkRead,
}: {
  kind: CoachKind;
  greeting?: string | null;
  focus?: string | null;
  oneTip?: string | null;
  hasRead: boolean;
  onMarkRead?: () => void;
}) {
  const Icon = kind === "morning" ? Sun : Moon;
  const label = kind === "morning" ? "AI Coach Pagi" : "AI Coach Malam";
  const emptyMsg =
    kind === "morning"
      ? "Belum ada sapaan pagi. Tap untuk generate."
      : "Belum ada refleksi malam. Tap untuk generate.";

  return (
    <Link
      to="/coach"
      onClick={onMarkRead}
      className="block bg-gradient-to-br from-violet-50 via-pink-50/30 to-orange-50/40 dark:from-violet-950/20 dark:via-pink-950/10 dark:to-orange-950/10 p-4 rounded-2xl outline-1 outline-violet-200/40 dark:outline-violet-800/30 hover:outline-violet-300/60 active:scale-[0.99] transition animate-fade-up"
    >
      <div className="flex items-start gap-3">
        <div className="size-9 rounded-xl bg-white/70 dark:bg-card/60 grid place-items-center text-violet-600 dark:text-violet-400 shrink-0 relative">
          <Sparkles className="size-4" aria-hidden />
          {!hasRead && greeting && (
            <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-coral ring-2 ring-white dark:ring-card" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Icon className="size-3 text-violet-600 dark:text-violet-400" aria-hidden />
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
              {label}
            </p>
            {hasRead && <Check className="size-3 text-muted-foreground" aria-hidden />}
          </div>
          {greeting ? (
            <>
              <p className="text-sm font-semibold leading-snug mt-0.5 line-clamp-1">
                {focus || greeting}
              </p>
              {oneTip && (
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">💡 {oneTip}</p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">{emptyMsg}</p>
          )}
        </div>
        <span className="text-violet-600 dark:text-violet-400 shrink-0 mt-1">
          <ArrowRight className="size-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
