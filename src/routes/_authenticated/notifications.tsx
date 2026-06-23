/**
 * /notifications — full notification feed.
 */
import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { NotificationList } from "@/features/groups/components/NotificationCenter";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-4">
        <TopAppBar title="Notifikasi" subtitle="Aktivitas terbaru untuk kamu" showBack />
        <NotificationList />
      </div>
      <BottomNav />
    </main>
  );
}
