import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/hydration/group")({ component: Page });

function Page() {
  const [ml, setMl] = useState(0);
  const target = 8000;
  const pct = Math.min(100, (ml / target) * 100);
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Hydration Challenge Grup" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm mb-2">
            Progress grup: {ml} / {target} ml
          </p>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex gap-2">
          {[250, 500, 1000].map((v) => (
            <button
              key={v}
              onClick={() => setMl(ml + v)}
              className="flex-1 rounded-lg border py-2 text-sm"
            >
              +{v}ml
            </button>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
