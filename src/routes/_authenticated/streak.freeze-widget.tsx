import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/streak/freeze-widget")({ component: Page });

function Page() {
  const [used, setUsed] = useState(false);
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Streak Freeze" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <div className="rounded-2xl border bg-card p-6 text-center space-y-3">
          <div className="text-6xl">🧊</div>
          <p className="text-sm">Lupa log hari ini? Gunakan freeze untuk menyelamatkan streakmu.</p>
          <button
            onClick={() => setUsed(true)}
            disabled={used}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm"
          >
            {used ? "✓ Freeze Digunakan" : "Gunakan 1 Freeze"}
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
