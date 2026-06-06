import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { GROUP_BONUS_BADGE_TTL_MS } from "@/lib/constants";
import { useMiniFocusTrap } from "@/hooks/useMiniFocusTrap";
import { useAnnounce } from "@/components/live-announcer";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function GroupBonusBadge({
  newClaims,
  setNewClaims,
  claimsTsRef,
  nowTick,
  groupSummary,
}: {
  newClaims: Record<string, number>;
  setNewClaims: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  claimsTsRef: React.MutableRefObject<Record<string, number>>;
  nowTick: number;
  groupSummary: Array<{ group_id: string; group?: string | null }>;
}) {
  const navigate = useNavigate();
  const announce = useAnnounce();
  const prefersReducedMotion = useReducedMotion();
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const breakdownRef = useRef<HTMLDivElement | null>(null);
  const badgeBtnRef = useRef<HTMLButtonElement | null>(null);
  const trapFirstRef = useRef<HTMLButtonElement | null>(null);
  const trapLastRef = useRef<HTMLButtonElement | null>(null);
  const [restoredFromBreakdown, setRestoredFromBreakdown] = useState(false);

  useEffect(() => {
    if (!breakdownOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!breakdownRef.current?.contains(e.target as Node)) {
        setBreakdownOpen(false);
        setRestoredFromBreakdown(true);
        badgeBtnRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [breakdownOpen]);

  useMiniFocusTrap(
    breakdownOpen,
    [trapFirstRef, trapLastRef],
    () => {
      setBreakdownOpen(false);
      setRestoredFromBreakdown(true);
      badgeBtnRef.current?.focus();
    },
    { autoFocusFirst: true },
  );

  useEffect(() => {
    if (!restoredFromBreakdown) return;
    announce("Popover ditutup, fokus dikembalikan ke badge klaim baru");
    const t = window.setTimeout(() => setRestoredFromBreakdown(false), 1500);
    return () => window.clearTimeout(t);
  }, [restoredFromBreakdown, announce]);

  const total = Object.values(newClaims).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const tsValues = Object.keys(newClaims)
    .map((gid) => claimsTsRef.current[gid])
    .filter((v): v is number => typeof v === "number");
  const latestTs = tsValues.length > 0 ? Math.max(...tsValues) : nowTick;
  const remaining = Math.max(0, GROUP_BONUS_BADGE_TTL_MS - (nowTick - latestTs));
  const pct = Math.round((remaining / GROUP_BONUS_BADGE_TTL_MS) * 100);
  const breakdown = Object.entries(newClaims)
    .map(([gid, n]) => {
      const g = groupSummary.find((x) => x.group_id === gid);
      return `${g?.group ?? "Grup"}: +${n}`;
    })
    .join(" · ");
  const entries = Object.entries(newClaims);

  return (
    <div className="ml-auto relative" ref={breakdownRef}>
      <button
        ref={badgeBtnRef}
        onClick={() => setBreakdownOpen((o) => !o)}
        className="relative text-[9px] font-bold uppercase bg-amber-100 text-amber-800 rounded-full pl-2 pr-2 pt-0.5 pb-1 overflow-hidden"
        title={breakdown || "Breakdown klaim baru"}
        data-restored-from={restoredFromBreakdown ? "breakdown" : undefined}
        aria-haspopup="dialog"
        aria-expanded={breakdownOpen}
        aria-live="polite"
        aria-atomic="true"
        aria-label={`+${total} klaim baru. ${breakdown || ""}`.trim()}
      >
        +{total} klaim baru
        <span
          aria-hidden
          className={
            prefersReducedMotion
              ? "absolute left-0 bottom-0 h-0.5 bg-amber-500/70"
              : "absolute left-0 bottom-0 h-0.5 bg-amber-500/70 transition-[width] duration-1000 ease-linear"
          }
          style={{ width: `${pct}%` }}
        />
      </button>
      {breakdownOpen && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="bonus-breakdown-heading"
          className="absolute right-0 top-full mt-1 z-20 w-48 bg-card outline-1 outline-black/10 rounded-xl shadow-lg p-2 text-[11px] animate-fade-up"
        >
          <p id="bonus-breakdown-heading" className="font-semibold mb-1 text-foreground">
            Breakdown
          </p>
          <ul className="space-y-0.5 max-h-40 overflow-y-auto">
            {entries.map(([gid, n]) => {
              const g = groupSummary.find((x) => x.group_id === gid);
              return (
                <li key={gid} className="flex justify-between gap-2">
                  <span className="truncate text-muted-foreground">{g?.group ?? "Grup"}</span>
                  <span className="font-bold tabular-nums">+{n}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex gap-1.5 mt-2 pt-2 border-t border-border/60">
            <button
              ref={trapFirstRef}
              onClick={() => {
                setNewClaims({});
                setBreakdownOpen(false);
              }}
              className="flex-1 text-[10px] font-semibold bg-muted hover:bg-muted/70 rounded-lg px-2 py-1"
            >
              Reset
            </button>
            <button
              ref={trapLastRef}
              onClick={() => {
                setBreakdownOpen(false);
                navigate({ to: "/challenges" });
              }}
              className="flex-1 text-[10px] font-semibold bg-primary text-primary-foreground rounded-lg px-2 py-1"
            >
              Lihat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
