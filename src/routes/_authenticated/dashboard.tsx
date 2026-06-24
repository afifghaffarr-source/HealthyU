import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { queryOptions, useQuery, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/features/profile/lib/profile.functions";
import { getDailyTip } from "@/features/daily-tips/lib/dailyTips.functions";
import { todaysMeals } from "@/features/meals/lib/meals.functions";
import { currentFast, getFastingStats } from "@/features/fasting/lib/fasting.functions";
import { todaysWater } from "@/features/water/lib/water.functions";
import { getGameSummary } from "@/features/gamification/lib/gamification.functions";
import { myGroupChallengeSummary } from "@/features/challenges/lib/groupChallengeSummary.functions";
import { myUnlinkedJoinedChallenges } from "@/features/challenges/lib/myUnlinkedChallenges.functions";
import { dailyCoach } from "@/features/coach/lib/coach.functions";
import { CoachCard } from "@/features/coach/components/CoachCard";
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
import { adaptiveGreeting } from "@/features/dashboard/lib/adaptiveGreeting";
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
import { QuickStatsGrid } from "@/features/dashboard/components/QuickStatsGrid";
import { TodayInsight } from "@/features/dashboard/components/TodayInsight";
import { SectionGroup } from "@/features/dashboard/components/SectionGroup";
import { AdherenceCard } from "@/features/mealplan/components/AdherenceCard";
import { PersonalRecordsCard } from "@/features/workout/components/PersonalRecordsCard";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { markFirstAction } from "@/lib/first-action";
import { useFastClock } from "@/features/dashboard/hooks/useFastClock";
import { useDashboardMutations } from "@/features/dashboard/hooks/useDashboardMutations";
import { HijriWidget } from "@/features/hijri/components/HijriWidget";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useTopPattern, useDismissPattern } from "@/features/patterns/hooks/usePatternInsights";
import {
  PatternInsightCard,
  PatternInsightCardSkeleton,
} from "@/features/patterns/components/PatternInsightCard";
import { handleQuickAction } from "@/features/patterns/lib/quickActions";
import { checkPatternTrigger } from "@/features/patterns/lib/triggerPattern.functions";

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
    queryClient.prefetchQuery({ queryKey: ["fast", "stats"], queryFn: () => getFastingStats() });
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
    // Lazy pattern detection trigger (24h check)
    checkPatternTrigger().catch((err) => console.error("[Dashboard] Pattern check failed:", err));
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
  const fetchFastStats = useServerFn(getFastingStats);
  const fetchWater = useServerFn(todaysWater);
  const fetchGame = useServerFn(getGameSummary);
  const fetchGroupChallenges = useServerFn(myGroupChallengeSummary);
  const fetchUnlinked = useServerFn(myUnlinkedJoinedChallenges);
  const fetchDailyCoach = useServerFn(dailyCoach);
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const { bonusClaimed, claimBonusMut, waterMutation, moodMutation } = useDashboardMutations();

  // Pattern insights (Sprint 10b)
  const { data: topPattern, isLoading: patternLoading } = useTopPattern(profile?.id);
  const dismissPatternMut = useDismissPattern();

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
  const { data: fastStats } = useQuery({
    queryKey: ["fast", "stats"],
    queryFn: () => fetchFastStats(),
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

  // AI Coach — get today's session (cached, doesn't trigger AI if exists)
  const { data: coachData } = useQuery({
    queryKey: ["coach", "today"],
    queryFn: () => fetchDailyCoach(),
    staleTime: 1000 * 60 * 30, // 30 min — server returns cached if exists
    retry: false, // silent fail if not generated yet
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
  const streak = game?.stats?.current_streak ?? 0;

  // Adaptive greeting — considers time, streak, fast state, meals logged
  const greeting = adaptiveGreeting({
    streak,
    hasActiveFast: !!fast,
    mealsToday: meals.length,
  });

  const { fastMs, fastHrs, fastPct } = useFastClock(fast);

  return (
    <main className="min-h-dvh bg-background pb-28">
      <PullIndicator pulling={pulling} refreshing={refreshing} />
      <div className="max-w-md mx-auto px-5 pt-6 space-y-5">
        <DashboardHeader
          greeting={greeting}
          fullName={profile?.full_name}
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

        {/* STATISTIK HARI INI — primary glance */}
        <SectionGroup label="Hari Ini" actionLabel="Detail" actionHref="/reports">
          <TodayInsight
            ctx={{
              totals,
              calTarget,
              waterMl,
              waterTarget,
              streak,
              mealsCount: meals.length,
            }}
          />
          <TodaysBalanceCard totals={totals} calTarget={calTarget} />
          <QuickStatsGrid
            totals={totals}
            calTarget={calTarget}
            waterMl={waterMl}
            waterTarget={waterTarget}
          />
        </SectionGroup>

        {/* AI COACH — daily personalized guidance */}
        <SectionGroup label="AI Coach" actionLabel="Buka" actionHref="/coach">
          <CoachCard
            kind="morning"
            greeting={coachData?.greeting}
            focus={coachData?.focus}
            oneTip={coachData?.tips?.[0]}
            hasRead={Boolean(coachData?.id && (coachData as { read_at?: string }).read_at)}
          />
        </SectionGroup>

        {/* PATTERN INSIGHTS — eating pattern detection (Sprint 10b) */}
        {patternLoading ? (
          <SectionGroup label="Pattern Insights" actionLabel="Semua" actionHref="/profile/insights">
            <PatternInsightCardSkeleton />
          </SectionGroup>
        ) : topPattern ? (
          <SectionGroup label="Pattern Insights" actionLabel="Semua" actionHref="/profile/insights">
            <PatternInsightCard
              pattern={topPattern}
              onDismiss={(id) => dismissPatternMut.mutate(id)}
              onQuickAction={handleQuickAction}
            />
          </SectionGroup>
        ) : null}

        {/* AKSI CEPAT */}
        <SectionGroup label="Aksi Cepat">
          <ActionRow />
        </SectionGroup>

        {/* TRACKING — fasting + water */}
        <SectionGroup label="Tracking" actionLabel="Semua" actionHref="/fasting">
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
        </SectionGroup>

        {/* MAKANAN HARI INI */}
        <TodaysMeals meals={meals} />

        {/* MEAL PLAN ADHERENCE */}
        <AdherenceCard />

        {/* WORKOUT PRs */}
        <PersonalRecordsCard />

        {/* Collapsible extras — keep first paint lean */}
        <Collapsible open={showMore} onOpenChange={setShowMore}>
          <CollapsibleTrigger className="flex items-center justify-center gap-1.5 w-full py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {showMore ? "Sembunyikan" : "Lihat Semua"}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showMore ? "rotate-180" : ""}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-5">
            {/* INSIGHT TAMBAHAN */}
            <SectionGroup label="Insight">
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
              <HydrationSuggestCard
                waterMl={waterMl}
                targetMl={waterTarget}
                hour={new Date().getHours()}
                onLog={(ml) => waterMutation.mutate(ml)}
                disabled={waterMutation.isPending}
              />
            </SectionGroup>

            {/* CHECK-IN & REFLEKSI */}
            <SectionGroup label="Check-In">
              <MoodQuickLog
                onPick={(m) => moodMutation.mutate(m)}
                disabled={moodMutation.isPending}
              />
              <MorningCheckInCard />
              <EveningReflectionCard />
            </SectionGroup>

            {/* MOTIVASI — streak, gamification, tips */}
            <SectionGroup label="Motivasi">
              <WeeklyReviewCard />
              <WeeklyGoalCard />
              <StreakFreezeBadge />
              {dailyTip && <DailyTipCard category={dailyTip.category} tip={dailyTip.tip} />}
              <GamificationCard
                streak={streak}
                level={game?.stats?.level ?? 1}
                xp={game?.stats?.xp ?? 0}
                onFreeze={() => setFreezeOpen(true)}
              />
            </SectionGroup>

            {/* LAINNYA */}
            <SectionGroup label="Lainnya">
              <HijriWidget variant="compact" />
              <GroupChallengeSummaryCard groupSummary={groupSummary} />
              <UnlinkedChallengesCard challenges={unlinkedChallenges} />
            </SectionGroup>
          </CollapsibleContent>
        </Collapsible>

        <FreezeDialog open={freezeOpen} onClose={() => setFreezeOpen(false)} />
      </div>
      <BottomNav />
    </main>
  );
}
