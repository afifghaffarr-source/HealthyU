import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/recipes/video")({ component: Page });

function Page() {
  const [title, setTitle] = useState("Nasi Goreng Sehat");
  const [steps] = useState(["Tumis bawang", "Masukkan nasi", "Bumbui", "Plating"]);
  const [idx, setIdx] = useState(0);
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Recipe Video" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background" />
        <div className="aspect-video rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center text-center p-6">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Step {idx + 1}/{steps.length}</p>
            <p className="text-2xl font-bold">{steps[idx]}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIdx(Math.max(0, idx - 1))} className="flex-1 rounded-lg border py-2 text-sm">Prev</button>
          <button onClick={() => setIdx(Math.min(steps.length - 1, idx + 1))} className="flex-1 rounded-lg bg-primary text-primary-foreground py-2 text-sm">Next</button>
        </div>
        <p className="text-xs text-muted-foreground">Generator video penuh akan menggunakan imagegen per step (TBD).</p>
      </main>
      <BottomNav />
    </div>
  );
}