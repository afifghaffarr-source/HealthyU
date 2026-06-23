/**
 * /workout/active — live workout tracker UI.
 * Loads active session from server, supports set logging, PR detection, rest timer.
 */
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { ActiveWorkoutSession } from "@/features/workout/components/ActiveWorkoutSession";

export const Route = createFileRoute("/_authenticated/workout/active")({
  validateSearch: (search: Record<string, unknown>) => ({
    session: typeof search.session === "string" ? search.session : undefined,
  }),
  component: WorkoutActivePage,
});

function WorkoutActivePage() {
  const search = useSearch({ from: "/_authenticated/workout/active" });
  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-4">
        <TopAppBar
          title="Sesi Aktif"
          subtitle={search.session ? "Tap set untuk catat" : "Auto-resume sesi"}
          showBack
        />
        <ActiveWorkoutSession />
      </div>
      <BottomNav />
    </main>
  );
}
