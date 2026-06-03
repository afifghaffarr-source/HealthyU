import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/lib/profile.functions";
import { todaysMeals } from "@/lib/meals.functions";
import { currentFast } from "@/lib/fasting.functions";
import { todaysWater, logWater } from "@/lib/water.functions";
import { getGameSummary } from "@/lib/gamification.functions";
import { myGroupChallengeSummary } from "@/lib/groupChallengeSummary.functions";
import { myUnlinkedJoinedChallenges } from "@/lib/myUnlinkedChallenges.functions";
import { addMood } from "@/lib/mood.functions";
import { getAchievementToastPrefix } from "@/lib/achievement-icons";
import { BottomNav } from "@/components/bottom-nav";
import { CalorieRing } from "@/components/calorie-ring";
import { formatDuration, fastingStage } from "@/lib/health";
import { Droplet, Plus, Sparkles, ArrowRight, Flame, Trophy, Camera, Smile } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getProfile);
  const fetchMeals = useServerFn(todaysMeals);
  const fetchFast = useServerFn(currentFast);
  const fetchWater = useServerFn(todaysWater);
  const logWaterFn = useServerFn(logWater);
  const fetchGame = useServerFn(getGameSummary);
  const addMoodFn = useServerFn(addMood);
  const fetchGroupChallenges = useServerFn(myGroupChallengeSummary);
  const fetchUnlinked = useServerFn(myUnlinkedJoinedChallenges);

  const { data: profile, isLoading: pLoad } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const { data: meals = [] } = useQuery({ queryKey: ["meals", "today"], queryFn: () => fetchMeals() });
  const { data: fast } = useQuery({ queryKey: ["fast", "current"], queryFn: () => fetchFast(), refetchInterval: 30000 });
  const { data: waterMl = 0 } = useQuery({ queryKey: ["water", "today"], queryFn: () => fetchWater() });
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
  const [newClaims, setNewClaims] = useState<Record<string, number>>({});

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
            setNewClaims((cur) => ({ ...cur, [gid]: (cur[gid] ?? 0) + 1 }));
            // Auto-clear this group's badge after 30s if user ignores it
            setTimeout(() => {
              setNewClaims((cur) => {
                if (!cur[gid]) return cur;
                const copy = { ...cur };
                delete copy[gid];
                return copy;
              });
            }, 30000);
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
              flushTimer = setTimeout(flush, 5000);
            } catch {
              /* ignore */
            }
          }
          qc.invalidateQueries({ queryKey: ["group-challenge-summary"] });
          qc.invalidateQueries({ queryKey: ["unlinked-joined-challenges"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coin_redemptions" },
        () => {
          qc.invalidateQueries({ queryKey: ["group-challenge-summary"] });
          qc.invalidateQueries({ queryKey: ["unlinked-joined-challenges"] });
        },
      )
      .subscribe();
    return () => {
      if (flushTimer) clearTimeout(flushTimer);
      supabase.removeChannel(ch);
    };
  }, [qc]);

  useEffect(() => {
    if (!pLoad && profile && !profile.onboarded) {
      navigate({ to: "/onboarding" });
    }
  }, [profile, pLoad, navigate]);

  const waterMutation = useMutation({
    mutationFn: (ml: number) => logWaterFn({ data: { amount_ml: ml } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["water", "today"] });
      qc.invalidateQueries({ queryKey: ["game", "summary"] });
      toast.success("+250ml dicatat");
      const newlyUnlocked = res?.game?.newlyUnlocked ?? [];
      newlyUnlocked.forEach((a) => toast.success(`${getAchievementToastPrefix(a.icon)} ${a.title} terbuka!`));
    },
  });

  const moodMutation = useMutation({
    mutationFn: (mood: number) => addMoodFn({ data: { mood } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mood"] });
      toast.success("Mood tercatat");
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
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-8 space-y-5">
        <header className="flex justify-between items-start animate-fade-up">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary/70 mb-1">{greeting}</p>
            <h1 className="text-2xl font-bold">Halo, {profile?.full_name?.split(" ")[0] ?? "Sahabat"}!</h1>
          </div>
          <Link to="/profile" className="size-11 rounded-full bg-card outline-1 outline-black/10 grid place-items-center font-bold text-primary">
            {(profile?.full_name ?? "U").slice(0, 1).toUpperCase()}
          </Link>
        </header>

        {/* Top row: Calorie + Fasting */}
        <div className="grid grid-cols-2 gap-3 animate-fade-up">
          <div className="bg-card p-4 rounded-3xl outline-1 outline-black/5 shadow-sm flex flex-col items-center justify-center">
            <CalorieRing consumed={totals.cal} target={calTarget} size={112} />
            <p className="text-xs font-semibold mt-2">Nutrisi hari ini</p>
            <p className="text-[10px] text-muted-foreground">{Math.round(totals.cal)} / {calTarget} kcal</p>
          </div>
          <Link to="/fasting" className="bg-card p-4 rounded-3xl outline-1 outline-black/5 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Puasa</p>
            {fast ? (
              <>
                <p className="text-2xl font-bold tabular-nums">{formatDuration(fastMs)}</p>
                <div className="h-1.5 w-full bg-mint rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-coral transition-all" style={{ width: `${fastPct}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 truncate">{fastingStage(fastHrs)}</p>
              </>
            ) : (
              <>
                <p className="text-base font-semibold">Mulai puasa</p>
                <p className="text-[11px] text-muted-foreground mt-1">16:8, OMAD, Ramadhan & lainnya</p>
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
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{m.label}</p>
              <p className="text-lg font-bold tabular-nums">{Math.round(m.value)}<span className="text-xs font-medium text-muted-foreground">g</span></p>
              <div className={`h-1 w-8 rounded-full mt-1 ${m.color}`} />
            </div>
          ))}
        </div>

        {/* Water */}
        <Link
          to="/water"
          className="bg-card p-4 rounded-3xl outline-1 outline-black/5 shadow-sm flex items-center gap-4 animate-fade-up"
        >
          <div className="size-12 rounded-2xl bg-sky-100 grid place-items-center">
            <Droplet className="size-5 text-sky-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Air</p>
            <p className="text-lg font-bold tabular-nums">
              {(waterMl / 1000).toFixed(1)}L <span className="text-xs text-muted-foreground font-medium">/ {waterTarget / 1000}L</span>
            </p>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              waterMutation.mutate(250);
            }}
            disabled={waterMutation.isPending}
            className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded-xl inline-flex items-center gap-1"
          >
            <Plus className="size-3.5" /> 250ml
          </button>
        </Link>

        {/* AI Scan CTA */}
        {/* Mood quick log */}
        <Link
          to="/mood"
          className="bg-card p-4 rounded-3xl outline-1 outline-black/5 shadow-sm flex items-center gap-3 animate-fade-up"
        >
          <div className="size-12 rounded-2xl bg-amber-100 grid place-items-center">
            <Smile className="size-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Mood hari ini</p>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((m) => (
                <button
                  key={m}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    moodMutation.mutate(m);
                  }}
                  disabled={moodMutation.isPending}
                  className="text-xl hover:scale-125 transition-transform"
                  aria-label={`Mood ${m}`}
                >
                  {["😢", "😕", "😐", "🙂", "😄"][m - 1]}
                </button>
              ))}
            </div>
          </div>
        </Link>

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
            <p className="text-[11px] text-muted-foreground">Personal sesuai sisa kalori & profil</p>
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
        <Link
          to="/achievements"
          className="bg-card p-4 rounded-3xl outline-1 outline-black/5 shadow-sm flex items-center gap-3 animate-fade-up"
        >
          <div className="size-12 rounded-2xl bg-orange-100 grid place-items-center">
            <Flame className="size-5 text-coral" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Level {game?.stats?.level ?? 1} · {game?.stats?.xp ?? 0} XP</p>
            <p className="font-semibold text-sm">
              Streak {game?.stats?.current_streak ?? 0} hari
            </p>
          </div>
          <Trophy className="size-5 text-primary" />
        </Link>

        {groupSummary.length > 0 && (
          <div className="block bg-card p-4 rounded-3xl outline-1 outline-black/5 shadow-sm animate-fade-up">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="size-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-wider">Challenge Grup</p>
              {(() => {
                const total = Object.values(newClaims).reduce((a, b) => a + b, 0);
                if (total === 0) return null;
                return (
                  <button
                    onClick={() => {
                      setNewClaims({});
                      navigate({ to: "/challenges" });
                    }}
                    className="ml-auto text-[9px] font-bold uppercase bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 animate-pulse"
                    title="Lihat semua leaderboard"
                  >
                    +{total} klaim baru
                  </button>
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
                      {(newClaims[g.group_id] ?? 0) > 0 && (
                        <span className="shrink-0 text-[9px] font-bold uppercase bg-amber-100 text-amber-800 rounded-full px-1.5 py-0.5">
                          +{newClaims[g.group_id]} klaim baru
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{g.group}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="font-bold">#{g.rank || "-"}<span className="text-muted-foreground font-normal">/{g.total_participants}</span></p>
                    <p className="text-[10px] text-muted-foreground">Hari {g.my_day}{g.duration_days ? `/${g.duration_days}` : ""}</p>
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
                                <img src={m.avatar_url} alt={m.name} className="size-full object-cover" />
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

        {/* Today's meals */}
        <section className="animate-fade-up">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold">Makan hari ini</h2>
            <Link to="/food" className="text-xs font-semibold text-primary">+ Tambah</Link>
          </div>
          {meals.length === 0 ? (
            <div className="bg-card p-6 rounded-3xl outline-1 outline-black/5 text-center">
              <p className="text-sm text-muted-foreground mb-3">Belum ada catatan hari ini</p>
              <Link to="/food" className="inline-block bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-xl">
                Catat makanan
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {meals.map((m) => (
                <div key={m.id} className="bg-card p-3 rounded-2xl outline-1 outline-black/5 flex items-center gap-3">
                  <div className="size-12 rounded-xl bg-mint grid place-items-center text-lg">🍽️</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase text-coral tracking-wider">{m.meal_type}</p>
                    <p className="font-semibold text-sm truncate">{(m.food_item as { name?: string } | null)?.name ?? m.custom_name ?? "Makanan"}</p>
                  </div>
                  <p className="text-sm font-bold tabular-nums">{Math.round(Number(m.calories))}<span className="text-[10px] text-muted-foreground"> kcal</span></p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}