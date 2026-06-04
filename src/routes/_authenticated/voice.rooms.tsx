import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/voice/rooms")({ component: Page });

const ROOMS = [
  { id: "morning-run", name: "🏃 Morning Run Club", members: 12 },
  { id: "meal-talk", name: "🥗 Meal Prep Talk", members: 8 },
  { id: "yoga-vibe", name: "🧘 Yoga Vibe", members: 5 },
];

function Page() {
  const [joined, setJoined] = useState<string | null>(null);
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Voice Rooms" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-2">
        {ROOMS.map((r) => (
          <div key={r.id} className="rounded-xl border bg-card p-3 flex justify-between items-center">
            <div>
              <p className="font-semibold flex items-center gap-2">
                <span className="relative inline-flex">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="absolute inset-0 size-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
                </span>
                {r.name}
              </p>
              <p className="text-xs text-muted-foreground">{r.members} aktif</p>
            </div>
            <button onClick={() => setJoined(joined === r.id ? null : r.id)} className="rounded-lg bg-primary text-primary-foreground px-3 py-1 text-sm">
              {joined === r.id ? "Keluar" : "Join"}
            </button>
          </div>
        ))}
        {joined && <p className="text-xs text-muted-foreground">WebRTC P2P akan ditambahkan setelah server signaling siap.</p>}
      </main>
      <BottomNav />
    </div>
  );
}