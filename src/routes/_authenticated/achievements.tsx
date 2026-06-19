import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getGameSummary,
  levelFromXp,
  xpForLevel,
} from "@/features/gamification/lib/gamification.functions";
import { AchievementIcon } from "@/lib/achievement-icons";
import { BottomNav } from "@/components/bottom-nav";
import { Flame, Trophy, Star, Share2 } from "lucide-react";
import { toast } from "@/lib/toast-config";

export const Route = createFileRoute("/_authenticated/achievements")({
  component: AchievementsPage,
});

function AchievementsPage() {
  const fetch = useServerFn(getGameSummary);
  const { data } = useQuery({ queryKey: ["game", "summary"], queryFn: () => fetch() });
  const shareRef = useRef<HTMLDivElement | null>(null);

  const handleShare = async () => {
    if (!shareRef.current) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(shareRef.current, { backgroundColor: null, scale: 2 });
      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("Gagal membuat gambar");
      const file = new File([blob], "achievement.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Pencapaianku di Healthy U" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "achievement.png";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Gambar diunduh");
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const stats = data?.stats;
  const xp = stats?.xp ?? 0;
  const level = stats?.level ?? levelFromXp(xp);
  const nextLevelXp = xpForLevel(level + 1);
  const thisLevelXp = xpForLevel(level);
  const pct = Math.min(
    100,
    Math.max(0, ((xp - thisLevelXp) / Math.max(1, nextLevelXp - thisLevelXp)) * 100),
  );
  const unlockedIds = new Set((data?.unlocked ?? []).map((u) => u.achievement_id));

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title="Pencapaian" showBack />

        <div ref={shareRef}>
          <section className="bg-gradient-to-br from-sage to-sage-deep p-5 rounded-3xl text-primary-foreground animate-fade-up">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-2xl bg-white/15 backdrop-blur grid place-items-center">
                <Star className="size-7" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                  Level
                </p>
                <p className="text-3xl font-bold tabular-nums">{level}</p>
                <p className="text-xs text-white/80">{xp.toLocaleString()} XP</p>
              </div>
            </div>
            <div className="h-2 w-full bg-white/15 rounded-full overflow-hidden mt-4">
              <div className="h-full bg-coral transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-white/75 mt-1.5 text-right">
              {Math.max(0, nextLevelXp - xp)} XP ke level {level + 1}
            </p>
          </section>
        </div>

        <button
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 bg-card outline-1 outline-black/10 font-semibold py-3 rounded-2xl text-sm"
        >
          <Share2 className="size-4" /> Bagikan pencapaian
        </button>

        <section className="grid grid-cols-2 gap-3 animate-fade-up">
          <div className="bg-card p-4 rounded-3xl outline-1 outline-black/5 flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-orange-100 grid place-items-center">
              <Flame className="size-5 text-coral" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                Streak
              </p>
              <p className="text-xl font-bold tabular-nums">
                {stats?.current_streak ?? 0}
                <span className="text-xs font-medium text-muted-foreground"> hari</span>
              </p>
            </div>
          </div>
          <div className="bg-card p-4 rounded-3xl outline-1 outline-black/5 flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-mint grid place-items-center">
              <Trophy className="size-5 text-sage-deep" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                Terpanjang
              </p>
              <p className="text-xl font-bold tabular-nums">
                {stats?.longest_streak ?? 0}
                <span className="text-xs font-medium text-muted-foreground"> hari</span>
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-2 animate-fade-up">
          <h2 className="font-bold text-sm px-1">
            Badge ({unlockedIds.size}/{data?.achievements.length ?? 0})
          </h2>
          {(data?.achievements ?? []).map((a) => {
            const unlocked = unlockedIds.has(a.id);
            return (
              <div
                key={a.id}
                className={`p-4 rounded-3xl outline-1 outline-black/5 flex items-center gap-4 ${
                  unlocked ? "bg-card" : "bg-card/60"
                }`}
              >
                <div
                  className={`size-12 rounded-2xl grid place-items-center ${
                    unlocked ? "bg-mint" : "bg-muted grayscale opacity-50"
                  }`}
                >
                  <AchievementIcon icon={a.icon} className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold ${unlocked ? "" : "text-muted-foreground"}`}>
                    {a.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
                <span
                  className={`text-xs font-bold tabular-nums ${unlocked ? "text-primary" : "text-muted-foreground"}`}
                >
                  +{a.xp_reward}
                </span>
              </div>
            );
          })}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
