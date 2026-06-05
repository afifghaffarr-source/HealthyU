import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { getSleepScore } from "@/lib/scanBatch8.functions";

export const Route = createFileRoute("/_authenticated/reports/sleep-score")({ component: Page });

function Page() {
  const fn = useServerFn(getSleepScore);
  const { data } = useQuery({
    queryKey: ["sleep-score"],
    queryFn: () => fn({ data: undefined as never }),
  });
  const rows = data?.rows ?? [];
  const avg = rows.length
    ? Math.round(rows.reduce((s: number, r: any) => s + r.score, 0) / rows.length)
    : 0;
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Skor Tidur" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border p-6 text-center">
          <div className="text-5xl font-bold">{avg}</div>
          <div className="text-xs text-muted-foreground mt-1">Skor rata-rata 7 hari</div>
        </div>
        <div className="space-y-2">
          {rows.map((r: any) => (
            <div
              key={r.date}
              className="flex items-center justify-between p-3 rounded-xl bg-card border"
            >
              <span className="text-sm">{r.date}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${r.score}%` }} />
                </div>
                <span className="text-sm font-medium w-8 text-right">{r.score}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
