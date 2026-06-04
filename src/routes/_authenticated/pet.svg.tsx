import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/_authenticated/pet/svg")({
  component: PetSvgPage,
});

const stages = ["🥚 Telur", "🐣 Anak", "🐥 Remaja", "🦆 Dewasa", "🦅 Elang"];

function PetSvgPage() {
  const [stage, setStage] = useState(0);
  return (
    <div className="min-h-screen pb-28 px-4">
      <TopAppBar title="Evolusi Pet" showBack />
      <div className="mt-8 flex flex-col items-center gap-6">
        <div className="text-8xl motion-safe:animate-bounce" aria-label={stages[stage]}>
          {stages[stage].split(" ")[0]}
        </div>
        <p className="text-lg font-bold">{stages[stage]}</p>
        <input
          type="range"
          min={0}
          max={stages.length - 1}
          value={stage}
          onChange={(e) => setStage(Number(e.target.value))}
          className="w-full max-w-xs"
          aria-label="Tahap evolusi"
        />
        <p className="text-xs text-muted-foreground">
          Tahap {stage + 1} / {stages.length}
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
