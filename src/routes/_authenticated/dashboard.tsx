import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
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
import { CalorieRing } from "@/components/calorie-ring";
import { Coachmark } from "@/components/healthyu/coachmark";
import { PullIndicator } from "@/components/healthyu/pull-indicator";
import { StreakRing } from "@/components/healthyu/streak-ring";
import { CoinPill } from "@/components/healthyu/coin-pill";
import { DailyBonusButton } from "@/features/dashboard/components/DailyBonusButton";
import { DailyTipCard } from "@/features/dashboard/components/DailyTipCard";
import { WaterCard } from "@/features/dashboard/components/WaterCard";
import { MoodQuickLog } from "@/features/dashboard/components/MoodQuickLog";
import { FreezeDialog } from "@/features/dashboard/components/FreezeDialog";
import { TodaysMeals } from "@/features/dashboard/components/TodaysMeals";
import { GroupChallengeSummaryCard } from "@/features/dashboard/components/GroupChallengeSummaryCard";
import { UnlinkedChallengesCard } from "@/features/dashboard/components/UnlinkedChallengesCard";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { formatDuration, fastingStage } from "@/lib/health";
import {
  Sparkles,
  ArrowRight,
  Flame,
  Trophy,
  Camera,
  Snowflake,
} from "lucide-react";
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
    // Critical: profile drives header + cal target + onboarding gate.
    const profile = await queryClient.ensureQueryData(profileQueryOptions);
    if (profile && !profile.onboarded) {
      throw redirect({ to: "/onboarding" });
    }
    // Non-critical: kick off in parallel so cards mount with data already in cache.
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
  const navigate = useNavigate();
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

  // Profile is primed in the loader → no loading flicker, no `pLoad` gate.
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

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 11) return "Selamat pagi";
    if (h < 15) return "Selamat siang";
    if (h < 18) return "Selamat sore";
    return "Selamat malam";
  })();

  return (
    <main className="min-h-dvh bg-background pb-28">
      <PullIndicator pulling={pulling} refreshing={refreshing} />
      <div className="max-w-md mx-auto px-5 pt-8 space-y-5">
        <header className="flex justify-between items-start animate-fade-up">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary/70 mb-1">
              {greeting}
            </p>
            <h1 className="text-2xl font-bold">
              Halo, {profile?.full_name?.split(" ")[0] ?? "Sahabat"}!
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <CoinPill />
            <Link
              to="/profile"
              className="size-11 rounded-full bg-card outline-1 outline-black/10 grid place-items-center font-bold text-primary"
            >
              {(profile?.full_name ?? "U").slice(0, 1).toUpperCase()}
            </Link>
          </div>
        </header>

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

        {/* Top row: Calorie + Fasting */}
        <div className="grid grid-cols-2 gap-3 animate-fade-up">
          <div className="bg-card p-4 rounded-3xl outline-1 outline-black/5 shadow-sm flex flex-col items-center justify-center">
            <CalorieRing
              consumed={totals.cal}
              target={calTarget}
              size={128}
              macros={{ protein: totals.p, carbs: totals.c, fat: totals.f }}
            />
            <p className="text-xs font-semibold mt-2" style={{ fontFamily: "var(--font-display)" }}>
              Nutrisi hari ini
            </p>
          </div>
          <Link
            to="/fasting"
            className="bg-card p-4 rounded-3xl outline-1 outline-black/5 shadow-sm flex flex-col justify-between"
          >
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
              Puasa
            </p>
            {fast ? (
              <>
                <p className="text-2xl font-bold tabular-nums">{formatDuration(fastMs)}</p>
                <div className="h-1.5 w-full bg-mint rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-coral transition-all"
                    style={{ width: `${fastPct}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 truncate">
                  {fastingStage(fastHrs)}
                </p>
              </>
            ) : (
              <>
                <p className="text-base font-semibold">Mulai puasa</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  16:8, OMAD, Ramadhan & lainnya
                </p>
                <p className="text-xs font-semibold text-primary mt-2 inline-flex items-center gap-1">
                  Pilih protokol <ArrowRight className="size-3" />
                </p>
              </>
            )}
          </Link>
        </div>

        {/* Macro breakdown */}
        <div className="bg-card p-4 rounded-3xl outline-1 outline-black/5 shadow-sm grid grid-cols-3 gap-2 animate-fade-up">
          {[
            { label: "Protein", value: totals.p, color: "bg-primary" },
            { label: "Karbo", value: totals.c, color: "bg-accent" },
            { label: "Lemak", value: totals.f, color: "bg-charcoal" },
          ].map((m) => (
            <div key={m.label}>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                {m.label}
              </p>
              <p className="text-lg font-bold tabular-nums">
                {Math.round(m.value)}
                <span className="text-xs font-medium text-muted-foreground">g</span>
              </p>
              <div className={`h-1 w-8 rounded-full mt-1 ${m.color}`} />
            </div>
          ))}
        </div>

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

        <Link
          to="/scan"
          className="block bg-card p-4 rounded-3xl outline-1 outline-primary/20 shadow-sm flex items-center gap-4 animate-fade-up"
        >
          <div className="size-12 rounded-2xl bg-primary/10 grid place-items-center">
            <Camera className="size-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm inline-flex items-center gap-1">
              Scan Makanan <Sparkles className="size-3 text-primary" />
            </p>
            <p className="text-[11px] text-muted-foreground">Foto → AI kenali kalori otomatis</p>
          </div>
          <ArrowRight className="size-5 text-muted-foreground" />
        </Link>

        {/* AI Recommendations CTA */}
        <Link
          to="/recommendations"
          className="block bg-card p-4 rounded-3xl outline-1 outline-primary/20 shadow-sm flex items-center gap-4 animate-fade-up"
        >
          <div className="size-12 rounded-2xl bg-primary/10 grid place-items-center">
            <Sparkles className="size-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Rekomendasi Meal Plan AI</p>
            <p className="text-[11px] text-muted-foreground">
              Personal sesuai sisa kalori & profil
            </p>
          </div>
          <ArrowRight className="size-5 text-muted-foreground" />
        </Link>

        {/* AI Chat CTA */}
        <Link
          to="/chat"
          className="block bg-gradient-to-br from-sage to-sage-deep p-5 rounded-3xl text-primary-foreground relative overflow-hidden animate-fade-up"
        >
          <div className="absolute -right-6 -bottom-6 size-32 bg-white/10 rounded-full blur-2xl" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-white/15 backdrop-blur grid place-items-center">
              <Sparkles className="size-6" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg">Tanya Dr. Healthy</p>
              <p className="text-xs text-white/80">"Berapa kalori 1 porsi rendang?"</p>
            </div>
            <ArrowRight className="size-5" />
          </div>
        </Link>

        {/* Gamification */}
        <div className="bg-card p-4 rounded-3xl outline-1 outline-black/5 shadow-sm flex items-center gap-3 animate-fade-up">
          <Link to="/achievements" className="flex items-center gap-3 flex-1 min-w-0">
            <StreakRing days={game?.stats?.current_streak ?? 0} goal={30} size={64} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                Level {game?.stats?.level ?? 1} · {game?.stats?.xp ?? 0} XP
              </p>
              <p className="font-semibold text-sm">
                Streak {game?.stats?.current_streak ?? 0} hari
              </p>
            </div>
            <Trophy className="size-5 text-primary" />
          </Link>
          <button
            onClick={() => setFreezeOpen(true)}
            aria-label="Streak freeze"
            className="size-10 rounded-xl bg-sky-100 grid place-items-center"
          >
            <Snowflake className="size-5 text-sky-600" />
          </button>
        </div>

        <FreezeDialog open={freezeOpen} onClose={() => setFreezeOpen(false)} />

        <GroupChallengeSummaryCard groupSummary={groupSummary} />

        <UnlinkedChallengesCard challenges={unlinkedChallenges} />

        <TodaysMeals meals={meals} />
      </div>
      <BottomNav />
    </main>
  );
}
