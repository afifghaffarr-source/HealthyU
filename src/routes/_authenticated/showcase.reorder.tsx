import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Reorder } from "motion/react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/_authenticated/showcase/reorder")({ component: Page });

function Page() {
  const [items, setItems] = useState([
    "🏆 100 Hari Streak",
    "💪 First Workout",
    "🥗 Meal Logger",
    "💧 Hydration King",
  ]);
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Atur Showcase" showBack />
      <main className="max-w-md mx-auto px-4 pt-4">
        <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-2">
          {items.map((it) => (
            <Reorder.Item
              key={it}
              value={it}
              className="rounded-xl border bg-card p-3 cursor-grab active:cursor-grabbing"
            >
              {it}
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </main>
      <BottomNav />
    </div>
  );
}
