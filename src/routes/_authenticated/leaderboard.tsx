import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listLeaderboard } from "@/features/groups/lib/social.functions";
import { BottomNav } from "@/components/bottom-nav";
import { Trophy, Flame } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const fetchLb = useServerFn(listLeaderboard);
  const { t } = useTranslation();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => fetchLb(),
  });

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title={t("leaderboard.title")} subtitle={t("leaderboard.subtitle")} showBack />

        {isLoading && <p className="text-sm text-muted-foreground">{t("leaderboard.loading")}</p>}

        <section className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.user_id}
              className={`flex items-center gap-3 p-4 rounded-2xl outline-1 outline-black/5 ${
                r.is_me ? "bg-primary/10 outline-primary/30" : "bg-card"
              }`}
            >
              <div
                className={`size-10 rounded-full grid place-items-center font-bold text-sm ${
                  r.rank === 1
                    ? "bg-yellow-400 text-black"
                    : r.rank === 2
                      ? "bg-gray-300 text-black"
                      : r.rank === 3
                        ? "bg-orange-400 text-black"
                        : "bg-muted text-muted-foreground"
                }`}
              >
                {r.rank <= 3 ? <Trophy className="size-4" /> : r.rank}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {r.name}
                  {r.is_me && t("leaderboard.you")}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  {t("leaderboard.level", { level: r.level })}
                  <span className="inline-flex items-center gap-0.5">
                    <Flame className="size-3" />
                    {r.current_streak}d
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold tabular-nums">{r.xp}</p>
                <p className="text-[10px] text-muted-foreground">{t("leaderboard.xp")}</p>
              </div>
            </div>
          ))}
          {!isLoading && rows.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-10">
              {t("leaderboard.empty")}
            </p>
          )}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
