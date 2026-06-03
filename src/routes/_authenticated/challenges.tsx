import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Trophy, Flame, Users, Calendar, Check, Medal, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import {
  listChallenges,
  joinChallenge,
  logChallengeDay,
  leaveChallenge,
} from "@/lib/challenges.functions";
import { getChallengeLeaderboard } from "@/lib/challengeLeaderboard.functions";
import {
  listMyGroupsForChallenge,
  inviteGroupToChallenge,
  listChallengeGroups,
} from "@/lib/groupChallenges.functions";

export const Route = createFileRoute("/_authenticated/challenges")({
  component: ChallengesPage,
});

function ChallengesPage() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listChallenges);
  const joinFn = useServerFn(joinChallenge);
  const logFn = useServerFn(logChallengeDay);
  const leaveFn = useServerFn(leaveChallenge);

  const { data, isLoading } = useQuery({
    queryKey: ["challenges"],
    queryFn: () => fetchAll(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["challenges"] });

  const joinM = useMutation({
    mutationFn: (challenge_id: string) => joinFn({ data: { challenge_id } }),
    onSuccess: (r) => {
      toast.success(r.already ? "Sudah bergabung" : "Bergabung challenge!");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const logM = useMutation({
    mutationFn: (p: { participant_id: string; day_number: number }) =>
      logFn({ data: p }),
    onSuccess: (r) => {
      toast.success(`Hari ${r.day} tercatat · streak ${r.streak}`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const leaveM = useMutation({
    mutationFn: (participant_id: string) => leaveFn({ data: { participant_id } }),
    onSuccess: () => {
      toast.success("Keluar dari challenge");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const challenges = data?.challenges ?? [];
  const partsByCh = new Map(
    (data?.participations ?? []).map((p) => [p.challenge_id, p] as const),
  );
  const [openLb, setOpenLb] = useState<string | null>(null);

  return (
    <div className="min-h-screen pb-32">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            to="/dashboard"
            className="size-9 inline-flex items-center justify-center rounded-full bg-muted"
            aria-label="Kembali"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-base font-bold flex items-center gap-2">
            <Trophy className="size-4 text-primary" />
            Challenges
          </h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        {isLoading && (
          <p className="text-sm text-muted-foreground text-center py-10">
            Memuat…
          </p>
        )}
        {!isLoading && challenges.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">
            Belum ada challenge tersedia.
          </p>
        )}
        {challenges.map((c) => {
          const part = partsByCh.get(c.id);
          const joined = !!part;
          const nextDay = (part?.current_day ?? 0) + 1;
          return (
            <article
              key={c.id}
              className="rounded-3xl bg-card outline-1 outline-black/5 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold leading-tight truncate">
                    {c.title}
                  </h2>
                  {c.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {c.description}
                    </p>
                  )}
                </div>
                {c.is_featured && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
                    Featured
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground mt-3">
                {c.duration_days && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3" />
                    {c.duration_days} hari
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3" />
                  {c.current_participants ?? 0}
                </span>
                {c.difficulty && (
                  <span className="capitalize">{c.difficulty}</span>
                )}
                {(c.xp_reward ?? 0) > 0 && (
                  <span className="text-primary font-semibold">
                    +{c.xp_reward} XP
                  </span>
                )}
                {(c.coin_reward ?? 0) > 0 && (
                  <span className="text-amber-600 font-semibold">
                    +{c.coin_reward} 🪙
                  </span>
                )}
              </div>

              {joined && (
                <div className="mt-3 flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <Flame className="size-3 text-orange-500" />
                    Streak {part!.streak ?? 0}
                  </span>
                  <span className="text-muted-foreground">
                    Hari {part!.current_day ?? 0}
                    {c.duration_days ? ` / ${c.duration_days}` : ""}
                  </span>
                </div>
              )}

              <div className="mt-3 flex gap-2">
                {!joined ? (
                  <button
                    onClick={() => joinM.mutate(c.id)}
                    disabled={joinM.isPending}
                    className="flex-1 h-10 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
                  >
                    Gabung
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() =>
                        logM.mutate({
                          participant_id: part!.id,
                          day_number: nextDay,
                        })
                      }
                      disabled={logM.isPending}
                      className="flex-1 h-10 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Check className="size-4" />
                      Catat hari {nextDay}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Keluar dari challenge ini?")) {
                          leaveM.mutate(part!.id);
                        }
                      }}
                      className="h-10 px-3 rounded-2xl bg-muted text-foreground text-sm"
                    >
                      Keluar
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => setOpenLb(openLb === c.id ? null : c.id)}
                className="mt-3 w-full text-[11px] font-semibold text-primary inline-flex items-center justify-center gap-1"
              >
                <Medal className="size-3" />
                {openLb === c.id ? "Sembunyikan leaderboard" : "Lihat leaderboard"}
              </button>
              {openLb === c.id && <Leaderboard challengeId={c.id} />}
              {joined && <GroupInviter challengeId={c.id} />}
            </article>
          );
        })}
      </main>

      <BottomNav />
    </div>
  );
}

function Leaderboard({ challengeId }: { challengeId: string }) {
  const fetchLb = useServerFn(getChallengeLeaderboard);
  const fetchGroups = useServerFn(listChallengeGroups);
  const [mode, setMode] = useState<"all" | "friends" | string>("all");
  const { data: groups = [] } = useQuery({
    queryKey: ["challenge-groups", challengeId],
    queryFn: () => fetchGroups({ data: { challenge_id: challengeId } }),
  });
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

function GroupInviter({ challengeId }: { challengeId: string }) {
  const qc = useQueryClient();
  const fetchGroups = useServerFn(listMyGroupsForChallenge);
  const inviteFn = useServerFn(inviteGroupToChallenge);
  const [open, setOpen] = useState(false);
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["my-groups-for-challenge", challengeId],
    queryFn: () => fetchGroups({ data: { challenge_id: challengeId } }),
    enabled: open,
  });
  const inviteM = useMutation({
    mutationFn: (group_id: string) =>
      inviteFn({ data: { group_id, challenge_id: challengeId } }),
    onSuccess: () => {
      toast.success("Grup diundang ke challenge");
      qc.invalidateQueries({ queryKey: ["my-groups-for-challenge", challengeId] });
      qc.invalidateQueries({ queryKey: ["challenge-groups", challengeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-[11px] font-semibold text-muted-foreground inline-flex items-center justify-center gap-1"
      >
        <UserPlus className="size-3" />
        {open ? "Tutup" : "Bareng grup"}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {isLoading && <p className="text-[11px] text-muted-foreground text-center">Memuat…</p>}
          {!isLoading && groups.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center">
              Belum ada grup. Buat di halaman Groups.
            </p>
          )}
          {groups.map((g) => (
            <div
              key={g.id}
              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-muted/40 text-xs"
            >
              <span className="truncate font-semibold">{g.name}</span>
              {g.joined ? (
                <span className="text-[10px] text-primary font-semibold">Aktif</span>
              ) : (
                <button
                  onClick={() => inviteM.mutate(g.id)}
                  disabled={inviteM.isPending}
                  className="text-[10px] font-semibold text-primary disabled:opacity-50"
                >
                  Undang
                </button>
              )}
            </div>
          ))}
        </div>
      )}
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
  if (rows.length === 0) return <p className="text-xs text-muted-foreground text-center mt-2">Belum ada peserta.</p>;
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