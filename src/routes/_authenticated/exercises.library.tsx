import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { listExercises } from "@/features/scan/lib/scanBatch9.functions";

export const Route = createFileRoute("/_authenticated/exercises/library")({ component: Page });

function Page() {
  const fn = useServerFn(listExercises);
  const [cat, setCat] = useState<string | undefined>();
  const { data } = useQuery({
    queryKey: ["exercises", cat],
    queryFn: () => fn({ data: { category: cat } }),
  });
  const cats = ["strength", "cardio", "core"];
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Exercise Library" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setCat(undefined)}
            className={`px-3 py-1 rounded-lg text-xs ${!cat ? "bg-primary text-primary-foreground" : "border"}`}
          >
            Semua
          </button>
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap ${cat === c ? "bg-primary text-primary-foreground" : "border"}`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {(data?.exercises ?? []).map((e) => (
            <div key={e.id} className="rounded-2xl bg-card border overflow-hidden">
              {e.video_url && (
                <iframe src={e.video_url} className="w-full aspect-video" allowFullScreen />
              )}
              <div className="p-3 space-y-1">
                <div className="font-semibold">{e.name}</div>
                <div className="text-xs text-muted-foreground">
                  {e.muscle_group} · {e.difficulty}
                </div>
                <p className="text-sm">{e.description}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
