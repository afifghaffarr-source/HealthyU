import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  queryOptions,
  useQuery,
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/features/profile/lib/profile.functions";
import { getDailyTip } from "@/lib/dailyTips.functions";
import { todaysMeals } from "@/lib/meals.functions";
import { currentFast } from "@/lib/fasting.functions";
import { todaysWater, logWater } from "@/features/water/lib/water.functions";
import { getGameSummary } from "@/lib/gamification.functions";
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
import { claimDailyLoginBonus } from "@/lib/scanBatch9.functions";
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
  const prefersReducedMotion = useReducedMotion();
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
  // Persistent per-group "+N klaim baru" counter, cleared when user clicks
  // or when the entry exceeds GROUP_BONUS_BADGE_TTL_MS at reload time.
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

  // Tick once per second while any claim badge is visible, so the TTL
  // countdown bar inside the badge animates down toward zero.
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
  // Mini focus-trap: Tab/Shift+Tab cycles antara Reset (first) & Lihat (last);
  // ESC menutup popover dan mengembalikan fokus ke tombol badge.
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
    // Announce via global LiveAnnouncer (centralized aria-live region).
    announce("Popover ditutup, fokus dikembalikan ke badge klaim baru");
    const t = window.setTimeout(() => setRestoredFromBreakdown(false), 1500);
    return () => window.clearTimeout(t);
  }, [restoredFromBreakdown, announce]);
  useEffect(() => {
    if (Object.keys(newClaims).length === 0) return;
    const id = window.setInterval(() => setNowTick(Date.now()), GROUP_BONUS_BADGE_TICK_MS);
    return () => window.clearInterval(id);
  }, [newClaims]);

  // Realtime: refresh group challenge summary when bonuses/redemptions change
  useEffect(() => {
    // Aggregator: collapse multiple claim toasts within a 5s window
    // into a single "🎉 N anggota klaim bonus di [Grup]" toast.
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
            // Auto-clear this group's badge after 30s if user ignores it
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
  }, [qc]);

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

        {groupSummary.length > 0 && (
          <div className="block bg-card p-4 rounded-3xl outline-1 outline-black/5 shadow-sm animate-fade-up">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="size-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-wider">Challenge Grup</p>
              {(() => {
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
                );
              })()}
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
                          const remaining = Math.max(0, GROUP_BONUS_BADGE_TTL_MS - (nowTick - ts));
                          const pct = Math.round((remaining / GROUP_BONUS_BADGE_TTL_MS) * 100);
                          return (
                            <span className="relative shrink-0 text-[9px] font-bold uppercase bg-amber-100 text-amber-800 rounded-full pl-1.5 pr-1.5 pt-0.5 pb-1 overflow-hidden">
                              +{newClaims[g.group_id]} klaim baru
                              <span
                                aria-hidden
                                className="absolute left-0 bottom-0 h-0.5 bg-amber-500/70 transition-[width] duration-1000 ease-linear"
                                style={{ width: `${pct}%` }}
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
        )}

        {unlinkedChallenges.length > 0 && (
          <div className="bg-card p-4 rounded-3xl outline-1 outline-primary/20 shadow-sm animate-fade-up">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="size-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-wider">Ajak grup ikut challenge</p>
            </div>
            <div className="space-y-1.5">
              {unlinkedChallenges.slice(0, 3).map((c) => (
                <Link
                  key={c.id}
                  to="/challenges"
                  search={{ challenge: c.id }}
                  className="flex items-center justify-between gap-2 bg-muted/40 hover:bg-muted/70 rounded-xl px-3 py-2 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{c.title}</p>
                    {(c.pending_members ?? 0) > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        {c.pending_members} anggota grup belum gabung
                      </p>
                    )}
                    {(c.preview_members?.length ?? 0) > 0 && (
                      <div className="flex items-center mt-1.5">
                        <div className="flex -space-x-1.5">
                          {c.preview_members!.map((m) => (
                            <span
                              key={m.id}
                              title={m.name}
                              className="size-5 rounded-full bg-primary/15 outline-2 outline-card grid place-items-center text-[9px] font-bold text-primary overflow-hidden"
                            >
                              {m.avatar_url ? (
                                <img
                                  src={m.avatar_url}
                                  alt={m.name}
                                  className="size-full object-cover"
                                />
                              ) : (
                                (m.name ?? "?").slice(0, 1).toUpperCase()
                              )}
                            </span>
                          ))}
                        </div>
                        {(c.pending_members ?? 0) > (c.preview_members?.length ?? 0) && (
                          <span className="text-[9px] text-muted-foreground ml-1.5">
                            +{(c.pending_members ?? 0) - (c.preview_members?.length ?? 0)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-primary font-semibold inline-flex items-center gap-1 shrink-0">
                    Undang <ArrowRight className="size-3" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <TodaysMeals meals={meals} />
      </div>
      <BottomNav />
    </main>
  );
}
