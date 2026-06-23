/**
 * /workout/programs — program picker. Start session → navigate to /workout/active.
 */
import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { ProgramPicker } from "@/features/workout/components/ProgramPicker";

export const Route = createFileRoute("/_authenticated/workout/programs")({
  component: WorkoutProgramsPage,
});

function WorkoutProgramsPage() {
  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title="Program Latihan" subtitle="Pilih preset program atau custom" showBack />
        <ProgramPicker />
      </div>
      <BottomNav />
    </main>
  );
}
