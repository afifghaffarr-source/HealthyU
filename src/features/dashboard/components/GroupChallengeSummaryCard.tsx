import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  GROUP_BONUS_AGGREGATE_MS,
  GROUP_BONUS_BADGE_TTL_MS,
  GROUP_BONUS_BADGE_TICK_MS,
} from "@/lib/constants";
import { useMiniFocusTrap } from "@/hooks/useMiniFocusTrap";
import { useAnnounce } from "@/components/live-announcer";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { myGroupChallengeSummary } from "@/features/challenges/lib/groupChallengeSummary.functions";

type GroupSummary = Awaited<ReturnType<typeof myGroupChallengeSummary>>[number];

export function GroupChallengeSummaryCard({
  groupSummary,
}: {
  groupSummary: GroupSummary[];
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const announce = useAnnounce();
  const prefersReducedMotion = useReducedMotion();

  const claimsTsRef = useRef<Record<string, number>>({});
  const [newClaims, setNewClaims] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.sessionStorage.getItem("dashboard:newClaims");
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, { count: number; ts: number }>;
      const now = Date.now();
      const out: Record<string, number> = {};
      for (const [gid, entry] of Object.entries(parsed)) {
        if (
          entry &&
          typeof entry.count === "number" &&
          typeof entry.ts === "number" &&
          now - entry.ts < GROUP_BONUS_BADGE_TTL_MS
        ) {
          out[gid] = entry.count;
          claimsTsRef.current[gid] = entry.ts;
        }
      }
      return out;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const keys = Object.keys(newClaims);
    if (keys.length === 0) {
      window.sessionStorage.removeItem("dashboard:newClaims");
      claimsTsRef.current = {};
      return;
    }
    const payload: Record<string, { count: number; ts: number }> = {};
    for (const k of keys) {
      payload[k] = { count: newClaims[k], ts: claimsTsRef.current[k] ?? Date.now() };
    }
    window.sessionStorage.setItem("dashboard:newClaims", JSON.stringify(payload));
  }, [newClaims]);

  const [nowTick, setNowTick] = useState(() => Date.now());
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
    return () => {
      document.removeEventListener("mousedown", onDown);
    };
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

  useEffect(() => {
    if (Object.keys(newClaims).length === 0) return;
    const id = window.setInterval(() => setNowTick(Date.now()), GROUP_BONUS_BADGE_TICK_MS);
    return () => window.clearInterval(id);
  }, [newClaims]);

  useEffect(() => {
    const buffer = new Map<string, { groupName: string; names: Set<string> }>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      flushTimer = null;
      for (const [groupId, { groupName, names }] of buffer.entries()) {
        const action = {
          label: "Lihat",
          onClick: () => navigate({ to: "/challenges", search: { group: groupId } }),
        };
        if (names.size === 1) {
          const [only] = Array.from(names);
          toast.success(`🎉 ${only} klaim bonus di ${groupName}`, { action });
        } else if (names.size > 1) {
          toast.success(`🎉 ${names.size} anggota klaim bonus di ${groupName}`, { action });
        }
      }
      buffer.clear();
    };
    const ch = supabase
      .channel("dashboard-group-summary")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_challenge_bonuses" },
        async (payload) => {
          const row = payload.new as { user_id?: string; group_id?: string } | null;
          if (row?.user_id && row?.group_id) {
            const gid = row.group_id;
            claimsTsRef.current[gid] = Date.now();
            setNewClaims((cur) => ({ ...cur, [gid]: (cur[gid] ?? 0) + 1 }));
            setTimeout(() => {
              setNewClaims((cur) => {
                if (!cur[gid]) return cur;
                const copy = { ...cur };
                delete copy[gid];
                return copy;
              });
            }, GROUP_BONUS_BADGE_TTL_MS);
            try {
              const [{ data: prof }, { data: grp }] = await Promise.all([
                supabase.from("profiles").select("full_name").eq("id", row.user_id).maybeSingle(),
                supabase.from("friend_groups").select("name").eq("id", row.group_id).maybeSingle(),
              ]);
              const name = prof?.full_name ?? "Seseorang";
              const groupName = grp?.name ?? "grup";
              const entry = buffer.get(gid) ?? { groupName, names: new Set<string>() };
              entry.names.add(name);
              entry.groupName = groupName;
              buffer.set(gid, entry);
              if (flushTimer) clearTimeout(flushTimer);
              flushTimer = setTimeout(flush, GROUP_BONUS_AGGREGATE_MS);
            } catch {
              /* ignore */
            }
          }
          qc.invalidateQueries({ queryKey: ["group-challenge-summary"] });
          qc.invalidateQueries({ queryKey: ["unlinked-joined-challenges"] });
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "coin_redemptions" }, () => {
        qc.invalidateQueries({ queryKey: ["group-challenge-summary"] });
        qc.invalidateQueries({ queryKey: ["unlinked-joined-challenges"] });
      })
      .subscribe();
    return () => {
      if (flushTimer) clearTimeout(flushTimer);
      supabase.removeChannel(ch);
    };
  }, [qc, navigate]);

  if (groupSummary.length === 0) return null;

  const total = Object.values(newClaims).reduce((a, b) => a + b, 0);
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
    <div className="block bg-card p-4 rounded-3xl outline-1 outline-black/5 shadow-sm animate-fade-up">
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="size-4 text-primary" />
        <p className="text-xs font-bold uppercase tracking-wider">Challenge Grup</p>
        {total > 0 && (
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
                <p
                  id="bonus-breakdown-heading"
                  className="font-semibold mb-1 text-foreground"
                >
                  Breakdown
                </p>
                <ul className="space-y-0.5 max-h-40 overflow-y-auto">
                  {entries.map(([gid, n]) => {
                    const g = groupSummary.find((x) => x.group_id === gid);
                    return (
                      <li key={gid} className="flex justify-between gap-2">
                        <span className="truncate text-muted-foreground">
                          {g?.group ?? "Grup"}
                        </span>
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
        )}
      </div>
      <div className="space-y-2">
        {groupSummary.slice(0, 3).map((g, i) => (
          <Link
            key={i}
            to="/challenges"
            search={{ group: g.group_id, challenge: g.challenge_id }}
            onClick={() =>
              setNewClaims((cur) => {
                if (!cur[g.group_id]) return cur;
                const copy = { ...cur };
                delete copy[g.group_id];
                return copy;
              })
            }
            className="flex items-center justify-between text-xs hover:bg-muted/50 rounded-xl p-1 -m-1"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate inline-flex items-center gap-1.5">
                <span className="truncate">{g.challenge}</span>
                {(newClaims[g.group_id] ?? 0) > 0 &&
                  (() => {
                    const ts = claimsTsRef.current[g.group_id] ?? nowTick;
                    const rem = Math.max(0, GROUP_BONUS_BADGE_TTL_MS - (nowTick - ts));
                    const p = Math.round((rem / GROUP_BONUS_BADGE_TTL_MS) * 100);
                    return (
                      <span className="relative shrink-0 text-[9px] font-bold uppercase bg-amber-100 text-amber-800 rounded-full pl-1.5 pr-1.5 pt-0.5 pb-1 overflow-hidden">
                        +{newClaims[g.group_id]} klaim baru
                        <span
                          aria-hidden
                          className="absolute left-0 bottom-0 h-0.5 bg-amber-500/70 transition-[width] duration-1000 ease-linear"
                          style={{ width: `${p}%` }}
                        />
                      </span>
                    );
                  })()}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{g.group}</p>
            </div>
            <div className="text-right shrink-0 ml-2">
              <p className="font-bold">
                #{g.rank || "-"}
                <span className="text-muted-foreground font-normal">
                  /{g.total_participants}
                </span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                Hari {g.my_day}
                {g.duration_days ? `/${g.duration_days}` : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}