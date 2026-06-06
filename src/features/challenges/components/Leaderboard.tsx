import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Flame } from "lucide-react";
import { getChallengeLeaderboard } from "@/features/challenges/lib/challengeLeaderboard.functions";
import { listChallengeGroups } from "@/features/challenges/lib/groupChallenges.functions";

export function Leaderboard({
  challengeId,
  initialGroup,
  autoSelectFirstGroup,
}: {
  challengeId: string;
  initialGroup?: string;
  autoSelectFirstGroup?: boolean;
}) {
  const fetchLb = useServerFn(getChallengeLeaderboard);
  const fetchGroups = useServerFn(listChallengeGroups);
  const [mode, setMode] = useState<"all" | "friends" | string>(initialGroup ?? "all");
  const { data: groups = [] } = useQuery({
    queryKey: ["challenge-groups", challengeId],
    queryFn: () => fetchGroups({ data: { challenge_id: challengeId } }),
  });
  useEffect(() => {
    if (!autoSelectFirstGroup) return;
    if (mode !== "all") return;
    if (groups.length === 0) return;
    setMode(groups[0].id);
  }, [autoSelectFirstGroup, groups, mode]);
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["challenge-lb", challengeId, mode],
    queryFn: () =>
      fetchLb({
        data: {
          challenge_id: challengeId,
          friends_only: mode === "friends",
          group_id: mode !== "all" && mode !== "friends" ? mode : undefined,
        },
      }),
  });
  return (
    <div className="mt-3 space-y-2">
      <div className="flex gap-1.5 bg-muted/50 rounded-full p-1 flex-wrap">
        <button
          onClick={() => setMode("all")}
          className={`flex-1 min-w-[60px] text-[11px] font-semibold py-1 rounded-full transition ${
            mode === "all" ? "bg-card shadow-sm" : "text-muted-foreground"
          }`}
        >
          Semua
        </button>
        <button
          onClick={() => setMode("friends")}
          className={`flex-1 min-w-[60px] text-[11px] font-semibold py-1 rounded-full transition ${
            mode === "friends" ? "bg-card shadow-sm" : "text-muted-foreground"
          }`}
        >
          Teman
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setMode(g.id)}
            className={`flex-1 min-w-[60px] text-[11px] font-semibold py-1 px-2 rounded-full transition truncate ${
              mode === g.id ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            {g.name}
          </button>
        ))}
      </div>
      <LeaderboardList rows={rows} isLoading={isLoading} />
    </div>
  );
}

function LeaderboardList({
  rows,
  isLoading,
}: {
  rows: Array<{
    user_id: string;
    rank: number;
    is_me: boolean;
    full_name: string;
    streak: number;
    current_day: number;
  }>;
  isLoading: boolean;
}) {
  if (isLoading) return <p className="text-xs text-muted-foreground text-center mt-2">Memuat…</p>;
  if (rows.length === 0)
    return <p className="text-xs text-muted-foreground text-center mt-2">Belum ada peserta.</p>;
  return (
    <ol className="space-y-1.5">
      {rows.map((r) => (
        <li
          key={r.user_id}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs ${
            r.is_me ? "bg-primary/10 outline-1 outline-primary/30" : "bg-muted/40"
          }`}
        >
          <span className="w-5 text-center font-bold tabular-nums">
            {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
          </span>
          <span className="flex-1 truncate font-semibold">
            {r.full_name}
            {r.is_me && <span className="ml-1 text-[10px] text-primary">(kamu)</span>}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Flame className="size-3 text-orange-500" />
            {r.streak}
          </span>
          <span className="tabular-nums text-muted-foreground">H{r.current_day}</span>
        </li>
      ))}
    </ol>
  );
}
