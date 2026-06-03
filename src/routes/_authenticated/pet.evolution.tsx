import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/_authenticated/pet/evolution")({ component: Page });

const STAGES = ["🥚", "🐣", "🐥", "🐤", "🦅"];

function Page() {
  const [s, setS] = useState(0);
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Pet Evolution" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-6 text-center">
        <motion.div key={s} initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200 }} className="text-9xl">
          {STAGES[s]}
        </motion.div>
        <p className="text-sm">Stage {s + 1} / {STAGES.length}</p>
        <button onClick={() => setS((s + 1) % STAGES.length)} className="rounded-lg bg-primary text-primary-foreground px-6 py-2 text-sm">Evolve!</button>
      </main>
      <BottomNav />
    </div>
  );
}