import { Link } from "@tanstack/react-router";
import { Gift, Flame, Sparkles, Moon, Sun, Cloud } from "lucide-react";
import { CoinPill } from "@/components/healthyu/coin-pill";
import { NotificationBell } from "@/features/groups/components/NotificationCenter";
import type { Greeting } from "@/features/dashboard/lib/adaptiveGreeting";

const MOOD_ICONS = {
  neutral: Cloud,
  warm: Sun,
  celebrate: Sparkles,
  fire: Flame,
  moon: Moon,
} as const;

const MOOD_TONES = {
  neutral: "from-sage/10 to-sage/5",
  warm: "from-amber-100/60 to-orange-50/30",
  celebrate: "from-amber-100 via-orange-100 to-pink-100/60",
  fire: "from-orange-100 to-red-100/60",
  moon: "from-indigo-100/50 to-violet-100/30",
} as const;

export function DashboardHeader({
  greeting,
  fullName,
  bonusAvailable,
  onClaimBonus,
  claiming,
}: {
  greeting: Greeting;
  fullName?: string | null;
  bonusAvailable?: boolean;
  onClaimBonus?: () => void;
  claiming?: boolean;
}) {
  const MoodIcon = MOOD_ICONS[greeting.mood];
  const tone = MOOD_TONES[greeting.mood];

  return (
    <header className="animate-fade-up">
      <div className="flex justify-between items-start mb-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/70 mb-1">
            {greeting.eyebrow}
          </p>
          <h1 className="text-2xl font-bold leading-tight">
            Halo, {fullName?.split(" ")[0] ?? "Sahabat"}!
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {bonusAvailable && onClaimBonus && (
            <button
              onClick={onClaimBonus}
              disabled={claiming}
              aria-label="Klaim bonus harian"
              className="inline-flex items-center gap-1 h-11 px-3 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200 text-xs font-semibold outline-1 outline-amber-500/30 disabled:opacity-60 active:scale-95 transition"
            >
              <Gift className="size-3.5" />
              Bonus
            </button>
          )}
          <NotificationBell />
          <CoinPill />
          <Link
            to="/profile"
            className="size-11 rounded-full bg-card outline-1 outline-black/10 grid place-items-center font-bold text-primary active:scale-95 transition"
          >
            {(fullName ?? "U").slice(0, 1).toUpperCase()}
          </Link>
        </div>
      </div>

      {/* Adaptive context card */}
      <div
        className={`bg-gradient-to-br ${tone} dark:from-transparent dark:to-transparent rounded-2xl p-3.5 flex items-start gap-3`}
      >
        <div className="size-9 rounded-xl bg-white/70 dark:bg-card/60 grid place-items-center text-primary shrink-0">
          <MoodIcon className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{greeting.primary}</p>
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
            {greeting.secondary}
          </p>
        </div>
      </div>
    </header>
  );
}
