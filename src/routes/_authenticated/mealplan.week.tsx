/**
 * /mealplan.week — 7-day meal plan calendar with adherence tracking.
 * Mobile-first: vertical scroll of day cards, top sticky summary.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { WeekCalendar } from "@/features/mealplan/components/WeekCalendar";
import { Sparkles, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mealplan/week")({
  component: MealPlanWeekPage,
});

function MealPlanWeekPage() {
  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar
          title="Meal Plan Mingguan"
          subtitle="Atur & pantau adherence plan 7 hari"
          showBack
        />

        <div className="flex gap-2 text-xs">
          <Link
            to="/recommendations"
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold py-2.5 rounded-2xl"
          >
            <Sparkles className="size-3.5" />
            Generate AI
          </Link>
          <Link
            to="/mealplan"
            className="flex-1 flex items-center justify-center gap-2 bg-card py-2.5 rounded-2xl font-semibold outline-1 outline-black/5"
          >
            <CalendarDays className="size-3.5" />
            Tampilan Hari
          </Link>
        </div>

        <WeekCalendar />
      </div>
      <BottomNav />
    </main>
  );
}
