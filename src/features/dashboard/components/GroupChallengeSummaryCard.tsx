import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { GROUP_BONUS_BADGE_TTL_MS } from "@/lib/constants";
import type { myGroupChallengeSummary } from "@/features/challenges/lib/groupChallengeSummary.functions";
import { useGroupBonusClaims } from "@/features/dashboard/hooks/useGroupBonusClaims";
import { GroupBonusBadge } from "@/features/dashboard/components/GroupBonusBadge";

type GroupSummary = Awaited<ReturnType<typeof myGroupChallengeSummary>>[number];

export function GroupChallengeSummaryCard({ groupSummary }: { groupSummary: GroupSummary[] }) {
  const { newClaims, setNewClaims, claimsTsRef, nowTick } = useGroupBonusClaims();

  if (groupSummary.length === 0) return null;

  return (
    <div className="block bg-card p-4 rounded-3xl outline-1 outline-black/5 shadow-sm animate-fade-up">
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="size-4 text-primary" />
        <p className="text-xs font-bold uppercase tracking-wider">Challenge Grup</p>
        <GroupBonusBadge
          newClaims={newClaims}
          setNewClaims={setNewClaims}
          claimsTsRef={claimsTsRef}
          nowTick={nowTick}
          groupSummary={groupSummary}
        />
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
                <span className="text-muted-foreground font-normal">/{g.total_participants}</span>
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
