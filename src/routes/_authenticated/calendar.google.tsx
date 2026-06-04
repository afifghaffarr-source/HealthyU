import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/_authenticated/calendar/google")({ component: Page });

function Page() {
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Google Calendar" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm mb-3">Sinkronkan jadwal workout & meal kamu ke Google Calendar.</p>
          <button
            onClick={() =>
              window.alert("OAuth Google Calendar akan dikonfigurasi (perlu CLIENT_ID)")
            }
            className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm"
          >
            Connect Google Calendar
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
