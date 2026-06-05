import { LifeBuoy } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Qualitative streak-rescue badge. Once per ISO week, the user can mark
 * "rescue used" to acknowledge a missed day — purely UI/local-state, no DB
 * change. Encourages consistency without shaming when life happens.
 * Hidden when streak < 3 (no streak to rescue yet).
 */
function isoWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNo}`;
}

export function StreakRescueBadge({ currentStreak }: { currentStreak: number }) {
  const weekKey = isoWeekKey();
  const storageKey = `streak-rescue:${weekKey}`;
  const [used, setUsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setUsed(window.localStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  if (currentStreak < 3) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (used) return;
        window.localStorage.setItem(storageKey, "1");
        setUsed(true);
      }}
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full transition ${
        used
          ? "bg-muted text-muted-foreground"
          : "bg-primary/10 text-primary hover:bg-primary/15"
      }`}
      aria-label={
        used
          ? "Rescue minggu ini sudah dipakai"
          : "Streak rescue tersedia minggu ini"
      }
    >
      <LifeBuoy className="size-3" aria-hidden />
      {used ? "Rescue dipakai" : "Rescue tersedia"}
    </button>
  );
}