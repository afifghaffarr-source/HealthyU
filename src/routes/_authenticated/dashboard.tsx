import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { queryOptions, useQuery, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/features/profile/lib/profile.functions";
import { getDailyTip } from "@/features/daily-tips/lib/dailyTips.functions";
import { todaysMeals } from "@/features/meals/lib/meals.functions";
import { currentFast } from "@/features/fasting/lib/fasting.functions";
import { todaysWater } from "@/features/water/lib/water.functions";
import { getGameSummary } from "@/features/gamification/lib/gamification.functions";
import { myGroupChallengeSummary } from "@/features/challenges/lib/groupChallengeSummary.functions";
import { myUnlinkedJoinedChallenges } from "@/features/challenges/lib/myUnlinkedChallenges.functions";
import { BottomNav } from "@/components/bottom-nav";
import { Coachmark } from "@/components/healthyu/coachmark";
import { PullIndicator } from "@/components/healthyu/pull-indicator";
import { DailyTipCard } from "@/features/dashboard/components/DailyTipCard";
import { WaterCard } from "@/features/dashboard/components/WaterCard";
import { MoodQuickLog } from "@/features/dashboard/components/MoodQuickLog";
import { FreezeDialog } from "@/features/dashboard/components/FreezeDialog";
import { TodaysMeals } from "@/features/dashboard/components/TodaysMeals";
import { GroupChallengeSummaryCard } from "@/features/dashboard/components/GroupChallengeSummaryCard";
import { UnlinkedChallengesCard } from "@/features/dashboard/components/UnlinkedChallengesCard";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { dashboardGreeting } from "@/features/dashboard/lib/dashboardGreeting";
import { HeroStatsRow, MacroBreakdown } from "@/features/dashboard/components/HeroStatsRow";
import { TodaysBalanceCard } from "@/features/dashboard/components/TodaysBalanceCard";
import { SmartNextStepCard } from "@/features/dashboard/components/SmartNextStepCard";
import { MacroGapInsightCard } from "@/features/dashboard/components/MacroGapInsightCard";
import { LocalFoodHintCard } from "@/features/dashboard/components/LocalFoodHintCard";
import { HydrationSuggestCard } from "@/features/dashboard/components/HydrationSuggestCard";
import { OfflineQueueBanner } from "@/components/healthyu/offline-queue-banner";
import { MorningCheckInCard } from "@/features/dashboard/components/MorningCheckInCard";
import { EveningReflectionCard } from "@/features/dashboard/components/EveningReflectionCard";
import { WeeklyGoalCard } from "@/features/dashboard/components/WeeklyGoalCard";
import { StreakFreezeBadge } from "@/features/dashboard/components/StreakFreezeBadge";
import { WeeklyReviewCard } from "@/features/dashboard/components/WeeklyReviewCard";
import { GamificationCard } from "@/features/dashboard/components/DashboardCtas";
import { ActionRow } from "@/features/dashboard/components/ActionRow";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { markFirstAction } from "@/lib/first-action";
import { useFastClock } from "@/features/dashboard/hooks/useFastClock";
import { useDashboardMutations } from "@/features/dashboard/hooks/useDashboardMutations";
import { HijriWidget } from "@/features/hijri/components/HijriWidget";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

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
  // User landed on dashboard = first meaningful interaction.
  // Signals PWA install prompt that user has seen real value.
  useEffect(() => {
    markFirstAction();
  }, []);
  const { pulling, refreshing } = usePullToRefresh(async () => {
    await qc.invalidateQueries();
  });
  const fetchMeals = useServerFn(todaysMeals);
  const fetchFast = useServerFn(currentFast);
  const fetchWater = useServerFn(todaysWater);
  const fetchGame = useServerFn(getGameSummary);
  const fetchGroupChallenges = useServerFn(myGroupChallengeSummary);
  const fetchUnlinked = useServerFn(myUnlinkedJoinedChallenges);
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const { bonusClaimed, claimBonusMut, waterMutation, moodMutation } = useDashboardMutations();

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

  const { fastMs, fastHrs, fastPct } = useFastClock(fast);

  const remainingKcal = Math.max(0, calTarget - totals.cal);
  const overKcal = Math.max(0, totals.cal - calTarget);
  const hour = new Date().getHours();
  const heroSubtitle = (() => {
    if (meals.length === 0) {
      return hour < 11
        ? "Mulai dengan sarapan ringan ya. Catat satu menu dulu."
        : "Belum ada catatan hari ini. Yuk catat satu makanan dulu.";
    }
    if (overKcal > 0) {
      return `Hari ini sedikit lewat target (~${overKcal} kkal). Tidak apa-apa, kita seimbangkan besok.`;
    }
    return `Sisa kalori hari ini ~${remainingKcal} kkal. Progress kecil tetap progress.`;
  })();

  return (
    <main className="min-h-dvh bg-background pb-28">
      <PullIndicator pulling={pulling} refreshing={refreshing} />
      <div className="max-w-md mx-auto px-5 pt-8 space-y-5">
        <DashboardHeader
          greeting={dashboardGreeting()}
          fullName={profile?.full_name}
          subtitle={heroSubtitle}
          bonusAvailable={!bonusClaimed}
          onClaimBonus={() => claimBonusMut.mutate()}
          claiming={claimBonusMut.isPending}
        />

        <OfflineQueueBanner />

        <Coachmark
          flagKey="dashboard-v1"
          title="Selamat datang di Healthy U"
          description="Geser ke bawah untuk refresh, ketuk kartu untuk catat aktivitas, dan kunjungi Profil untuk personalisasi."
        />

        <TodaysBalanceCard totals={totals} calTarget={calTarget} />

        <ActionRow />

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

        <TodaysMeals meals={meals} />

        <Collapsible open={showMore} onOpenChange={setShowMore}>
          <CollapsibleTrigger className="flex items-center justify-center gap-1.5 w-full py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {showMore ? "Sembunyikan" : "Lihat Semua"}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showMore ? "rotate-180" : ""}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-5">
            <SmartNextStepCard
              hour={new Date().getHours()}
              timezone={profile?.timezone ?? undefined}
              mealCount={meals.length}
              waterMl={waterMl}
              waterTarget={waterTarget}
              fastActive={!!fast}
              remainingKcal={Math.max(0, calTarget - totals.cal)}
            />

            <MacroGapInsightCard totals={totals} calTarget={calTarget} />

            <LocalFoodHintCard hour={new Date().getHours()} />

            <HijriWidget variant="compact" />

            <HydrationSuggestCard
              waterMl={waterMl}
              targetMl={waterTarget}
              hour={new Date().getHours()}
              onLog={(ml) => waterMutation.mutate(ml)}
              disabled={waterMutation.isPending}
            />

            <MoodQuickLog
              onPick={(m) => moodMutation.mutate(m)}
              disabled={moodMutation.isPending}
            />

            <MorningCheckInCard />
            <EveningReflectionCard />
            <WeeklyReviewCard />

            <WeeklyGoalCard />
            <StreakFreezeBadge />

            {dailyTip && <DailyTipCard category={dailyTip.category} tip={dailyTip.tip} />}

            <GamificationCard
              streak={game?.stats?.current_streak ?? 0}
              level={game?.stats?.level ?? 1}
              xp={game?.stats?.xp ?? 0}
              onFreeze={() => setFreezeOpen(true)}
            />

            <GroupChallengeSummaryCard groupSummary={groupSummary} />

            <UnlinkedChallengesCard challenges={unlinkedChallenges} />
          </CollapsibleContent>
        </Collapsible>

        <FreezeDialog open={freezeOpen} onClose={() => setFreezeOpen(false)} />
      </div>
      <BottomNav />
    </main>
  );
}
