import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { getWeeklyLeaderboard } from "@/features/scan/lib/scanBatch12.functions";

export const Route = createFileRoute("/_authenticated/leaderboard/weekly")({ component: Page });

function Page() {
  const fn = useServerFn(getWeeklyLeaderboard);
  const { data } = useQuery({
    queryKey: ["lb-week"],
    queryFn: () => fn({ data: undefined as never }),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Leaderboard Mingguan" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-2">
        <p className="text-xs text-muted-foreground">Minggu: {data?.week}</p>
        {(data?.rows ?? []).map((r, i) => (
          <div key={r.user_id} className="flex justify-between rounded-xl border bg-card p-3">
            <span>
              #{i + 1} {r.user_id.slice(0, 8)}
            </span>
            <span className="font-semibold">{r.score}</span>
          </div>
        ))}
      </main>
      <BottomNav />
    </div>
  );
}
