import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  queryOptions,
  useQuery,
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/features/profile/lib/profile.functions";
import { getDailyTip } from "@/features/daily-tips/lib/dailyTips.functions";
import { todaysMeals } from "@/features/meals/lib/meals.functions";
import { currentFast } from "@/features/fasting/lib/fasting.functions";
import { todaysWater, logWater } from "@/features/water/lib/water.functions";
import { getGameSummary } from "@/features/gamification/lib/gamification.functions";
import { myGroupChallengeSummary } from "@/features/challenges/lib/groupChallengeSummary.functions";
import { myUnlinkedJoinedChallenges } from "@/features/challenges/lib/myUnlinkedChallenges.functions";
import { addMood } from "@/features/mood/lib/mood.functions";
import { getAchievementToastPrefix } from "@/lib/achievement-icons";
import { BottomNav } from "@/components/bottom-nav";
import { Coachmark } from "@/components/healthyu/coachmark";
import { PullIndicator } from "@/components/healthyu/pull-indicator";
import { DailyBonusButton } from "@/features/dashboard/components/DailyBonusButton";
import { DailyTipCard } from "@/features/dashboard/components/DailyTipCard";
import { WaterCard } from "@/features/dashboard/components/WaterCard";
import { MoodQuickLog } from "@/features/dashboard/components/MoodQuickLog";
import { FreezeDialog } from "@/features/dashboard/components/FreezeDialog";
import { TodaysMeals } from "@/features/dashboard/components/TodaysMeals";
import { GroupChallengeSummaryCard } from "@/features/dashboard/components/GroupChallengeSummaryCard";
import { UnlinkedChallengesCard } from "@/features/dashboard/components/UnlinkedChallengesCard";
import {
  DashboardHeader,
  dashboardGreeting,
} from "@/features/dashboard/components/DashboardHeader";
import {
  HeroStatsRow,
  MacroBreakdown,
} from "@/features/dashboard/components/HeroStatsRow";
import {
  ScanCta,
  AiRecommendationsCta,
  AiChatCta,
  GamificationCard,
} from "@/features/dashboard/components/DashboardCtas";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { claimDailyLoginBonus } from "@/features/scan/lib/scanBatch9.functions";
import { toast } from "sonner";
import { useAnnounce } from "@/components/live-announcer";

const profileQueryOptions = queryOptions({
  queryKey: ["profile"],
  queryFn: () => getProfile(),
});

const dailyTipQueryOptions = queryOptions({
  queryKey: ["daily-tip", new Date().toISOString().slice(0, 10)],
  queryFn: () => getDailyTip(),
  staleTime: 1000 * 60 * 60 * 6,
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: async ({ context: { queryClient } }) => {
    const profile = await queryClient.ensureQueryData(profileQueryOptions);
    if (profile && !profile.onboarded) {
      throw redirect({ to: "/onboarding" });
    }
    queryClient.prefetchQuery(dailyTipQueryOptions);
    queryClient.prefetchQuery({ queryKey: ["meals", "today"], queryFn: () => todaysMeals() });
    queryClient.prefetchQuery({ queryKey: ["fast", "current"], queryFn: () => currentFast() });
    queryClient.prefetchQuery({ queryKey: ["water", "today"], queryFn: () => todaysWater() });
    queryClient.prefetchQuery({ queryKey: ["game", "summary"], queryFn: () => getGameSummary() });
    queryClient.prefetchQuery({
      queryKey: ["group-challenge-summary"],
      queryFn: () => myGroupChallengeSummary(),
    });
    queryClient.prefetchQuery({
      queryKey: ["unlinked-joined-challenges"],
      queryFn: () => myUnlinkedJoinedChallenges(),
    });
  },
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const { pulling, refreshing } = usePullToRefresh(async () => {
    await qc.invalidateQueries();
  });
  const announce = useAnnounce();
  const fetchMeals = useServerFn(todaysMeals);
  const fetchFast = useServerFn(currentFast);
  const fetchWater = useServerFn(todaysWater);
  const logWaterFn = useServerFn(logWater);
  const fetchGame = useServerFn(getGameSummary);
  const addMoodFn = useServerFn(addMood);
  const fetchGroupChallenges = useServerFn(myGroupChallengeSummary);
  const fetchUnlinked = useServerFn(myUnlinkedJoinedChallenges);
  const claimBonusFn = useServerFn(claimDailyLoginBonus);
  const [bonusClaimed, setBonusClaimed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("dailyBonusClaimed") === new Date().toDateString();
  });
  const [freezeOpen, setFreezeOpen] = useState(false);
  const claimBonusMut = useMutation({
    mutationFn: () => claimBonusFn({ data: undefined as never }),
    onSuccess: (r) => {
      const b = r.bonus as { coins?: number; streak?: number } | undefined;
      window.localStorage.setItem("dailyBonusClaimed", new Date().toDateString());
      setBonusClaimed(true);
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success(
        r.alreadyClaimed
          ? "Sudah klaim hari ini"
          : `+${b?.coins ?? 0} koin! Streak ${b?.streak ?? 0}`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const { data: dailyTip } = useQuery(dailyTipQueryOptions);
  const { data: meals = [] } = useQuery({
    queryKey: ["meals", "today"],
    queryFn: () => fetchMeals(),
  });
  const { data: fast } = useQuery({
    queryKey: ["fast", "current"],
    queryFn: () => fetchFast(),
    refetchInterval: 30000,
  });
  const { data: waterMl = 0 } = useQuery({
    queryKey: ["water", "today"],
    queryFn: () => fetchWater(),
  });
  const { data: game } = useQuery({ queryKey: ["game", "summary"], queryFn: () => fetchGame() });
  const { data: groupSummary = [] } = useQuery({
    queryKey: ["group-challenge-summary"],
    queryFn: () => fetchGroupChallenges(),
  });
  const { data: unlinkedChallenges = [] } = useQuery({
    queryKey: ["unlinked-joined-challenges"],
    queryFn: () => fetchUnlinked(),
  });

  const waterMutation = useMutation({
    mutationFn: (ml: number) => logWaterFn({ data: { amount_ml: ml } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["water", "today"] });
      qc.invalidateQueries({ queryKey: ["game", "summary"] });
      toast.success("+250ml dicatat");
      announce("250 mililiter air tercatat");
      const newlyUnlocked = res?.game?.newlyUnlocked ?? [];
      newlyUnlocked.forEach((a) =>
        toast.success(`${getAchievementToastPrefix(a.icon)} ${a.title} terbuka!`),
      );
    },
  });

  const moodMutation = useMutation({
    mutationFn: (mood: number) => addMoodFn({ data: { mood } }),
    onSuccess: (_r, mood) => {
      qc.invalidateQueries({ queryKey: ["mood"] });
      toast.success("Mood tercatat");
      announce(`Mood ${mood} dari 5 tercatat`);
    },
  });

  const totals = meals.reduce(
    (acc, m) => ({
      cal: acc.cal + Number(m.calories || 0),
      p: acc.p + Number(m.protein_g || 0),
      c: acc.c + Number(m.carbs_g || 0),
      f: acc.f + Number(m.fat_g || 0),
    }),
    { cal: 0, p: 0, c: 0, f: 0 },
  );

  const calTarget = profile?.daily_calorie_target ?? 2000;
  const waterTarget = 2500;

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!fast) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [fast]);
  const fastMs = fast ? now - new Date(fast.start_time).getTime() : 0;
  const fastHrs = fastMs / 3600000;
  const fastPct = fast ? Math.min(100, (fastHrs / Number(fast.target_hours)) * 100) : 0;

  return (
    <main className="min-h-dvh bg-background pb-28">
      <PullIndicator pulling={pulling} refreshing={refreshing} />
      <div className="max-w-md mx-auto px-5 pt-8 space-y-5">
        <DashboardHeader greeting={dashboardGreeting()} fullName={profile?.full_name} />

        {!bonusClaimed && (
          <DailyBonusButton
            onClick={() => claimBonusMut.mutate()}
            disabled={claimBonusMut.isPending}
          />
        )}

        <Coachmark
          flagKey="dashboard-v1"
          title="Selamat datang di Healthy U"
          description="Geser ke bawah untuk refresh, ketuk kartu untuk catat aktivitas, dan kunjungi Profil untuk personalisasi."
        />

        {dailyTip && <DailyTipCard category={dailyTip.category} tip={dailyTip.tip} />}

        <HeroStatsRow
          totals={totals}
          calTarget={calTarget}
          fast={fast}
          fastMs={fastMs}
          fastHrs={fastHrs}
          fastPct={fastPct}
        />

        <MacroBreakdown totals={totals} />

        <WaterCard
          waterMl={waterMl}
          targetMl={waterTarget}
          onLog={(ml) => waterMutation.mutate(ml)}
          disabled={waterMutation.isPending}
        />

        <MoodQuickLog
          onPick={(m) => moodMutation.mutate(m)}
          disabled={moodMutation.isPending}
        />

        <ScanCta />
        <AiRecommendationsCta />
        <AiChatCta />

        <GamificationCard
          streak={game?.stats?.current_streak ?? 0}
          level={game?.stats?.level ?? 1}
          xp={game?.stats?.xp ?? 0}
          onFreeze={() => setFreezeOpen(true)}
        />

        <FreezeDialog open={freezeOpen} onClose={() => setFreezeOpen(false)} />

        <GroupChallengeSummaryCard groupSummary={groupSummary} />

        <UnlinkedChallengesCard challenges={unlinkedChallenges} />

        <TodaysMeals meals={meals} />
      </div>
      <BottomNav />
    </main>
  );
}