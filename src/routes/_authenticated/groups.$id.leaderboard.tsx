import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { getGroupScanLeaderboard } from "@/lib/scanSocial.functions";
import { Flame, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/groups/$id/leaderboard")({
  component: Page,
});

function Page() {
  const { id } = useParams({ from: "/_authenticated/groups/$id/leaderboard" });
  const fn = useServerFn(getGroupScanLeaderboard);
  const { data } = useQuery({
    queryKey: ["group-scan-lb", id],
    queryFn: () => fn({ data: { groupId: id } }),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Scan Leaderboard" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-2">
        {data?.rows.map((r, i) => (
          <div key={r.userId} className="flex items-center gap-3 rounded-2xl bg-card border p-3">
            <div className="size-9 rounded-full bg-primary/10 grid place-items-center text-sm font-bold">
              {i === 0 ? <Trophy className="size-5 text-yellow-500" /> : i + 1}
            </div>
            {r.avatar ? (
              <img src={r.avatar} alt="" className="size-9 rounded-full" />
            ) : (
              <div className="size-9 rounded-full bg-muted" />
            )}
            <div className="flex-1">
              <div className="font-medium text-sm">{r.name}</div>
              <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Flame className="size-3 text-orange-500" /> {r.streak} hari · {r.scans} scan 7hr
              </div>
            </div>
          </div>
        ))}
      </main>
      <BottomNav />
    </div>
  );
}