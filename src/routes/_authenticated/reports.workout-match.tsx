import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { getWorkoutMatch } from "@/lib/scanSocial.functions";
import { Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports/workout-match")({
  component: Page,
});

function Page() {
  const fn = useServerFn(getWorkoutMatch);
  const { data } = useQuery({
    queryKey: ["workout-match"],
    queryFn: () => fn({ data: undefined as any }),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Workout Match" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4">
          <div className="text-xs text-muted-foreground">Total kalori hari ini</div>
          <div className="text-3xl font-bold">{Math.round(data?.totalKcal ?? 0)} kkal</div>
        </div>
        {data?.suggestions.map((s) => (
          <div key={s.type} className="flex items-center gap-3 rounded-2xl bg-card border p-3">
            <Activity className="size-5 text-primary" />
            <div className="flex-1">
              <div className="font-medium text-sm">{s.type}</div>
              <div className="text-xs text-muted-foreground">untuk bakar kalori hari ini</div>
            </div>
            <div className="text-lg font-bold">
              {s.minutes}
              <span className="text-xs"> mnt</span>
            </div>
          </div>
        ))}
      </main>
      <BottomNav />
    </div>
  );
}
