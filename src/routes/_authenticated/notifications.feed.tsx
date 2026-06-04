import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { listNotifications, markNotifRead } from "@/lib/scanBatch8.functions";
import { Bell, BellOff } from "lucide-react";
import { EmptyState } from "@/components/healthyu/empty-state";
import { ListSkeleton } from "@/components/healthyu/skeletons";

export const Route = createFileRoute("/_authenticated/notifications/feed")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const listFn = useServerFn(listNotifications);
  const readFn = useServerFn(markNotifRead);
  const { data, isLoading } = useQuery({ queryKey: ["notif-feed"], queryFn: () => listFn({ data: undefined as any }) });
  const mut = useMutation({
    mutationFn: (id: string) => readFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notif-feed"] }),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Notifikasi" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-2">
        {isLoading && <ListSkeleton count={4} />}
        {(data?.items ?? []).map((n: any) => (
          <Link
            key={n.id}
            to={n.link ?? "/dashboard"}
            onClick={() => !n.read && mut.mutate(n.id)}
            className={`block p-3 rounded-xl border ${n.read ? "bg-card" : "bg-primary/5 border-primary/30"}`}
          >
            <div className="flex items-start gap-3">
              <Bell className="size-4 text-primary mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-sm">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
              </div>
            </div>
          </Link>
        ))}
        {!isLoading && (data?.items ?? []).length === 0 && (
          <EmptyState icon={BellOff} title="Belum ada notifikasi" description="Notifikasi baru akan muncul di sini." />
        )}
      </main>
      <BottomNav />
    </div>
  );
}