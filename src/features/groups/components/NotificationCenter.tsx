/**
 * NotificationBell + NotificationList — TopAppBar badge + notifications page.
 * Reads from /notifications route. Bell shows unread count with pulse.
 */
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Heart, Trophy, Flame, Users, MessageCircle, ChevronRight } from "lucide-react";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/features/groups/lib/socialEnhanced.functions";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast-config";

const TYPE_ICON: Record<string, typeof Bell> = {
  reaction: Heart,
  follow: Users,
  comment: MessageCircle,
  streak: Flame,
  pr: Trophy,
  challenge: Trophy,
  default: Bell,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}j`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}h`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function NotificationBell() {
  const fn = useServerFn(getUnreadCount);
  const { data } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => fn({ data: undefined }),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const unread = data?.unread ?? 0;

  return (
    <Link
      to="/notifications"
      className="relative size-11 rounded-full bg-card outline-1 outline-black/10 grid place-items-center text-primary active:scale-95 transition"
      aria-label={unread > 0 ? `${unread} notifikasi belum dibaca` : "Notifikasi"}
    >
      <Bell className="size-5" />
      {unread > 0 && (
        <span
          className={cn(
            "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold grid place-items-center tabular-nums",
            unread > 0 && "animate-pulse",
          )}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

export function NotificationList() {
  const qc = useQueryClient();
  const listFn = useServerFn(getNotifications);
  const readFn = useServerFn(markNotificationRead);
  const readAllFn = useServerFn(markAllNotificationsRead);

  const { data: items = [] } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => listFn({ data: undefined }),
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => readFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllMut = useMutation({
    mutationFn: () => readAllFn({ data: undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Semua notifikasi ditandai sudah dibaca");
    },
  });

  const unreadCount = (items as Array<{ read: boolean }>).filter((i) => !i.read).length;

  return (
    <div className="space-y-3">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => markAllMut.mutate()}
            disabled={markAllMut.isPending}
            className="text-xs font-semibold text-primary"
          >
            Tandai semua dibaca ({unreadCount})
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-card rounded-3xl p-8 text-center outline-1 outline-black/5">
          <Bell className="size-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Belum ada notifikasi. Mulai follow orang atau post di komunitas!
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {(
            items as Array<{
              id: string;
              type: string;
              title: string;
              body: string | null;
              link: string | null;
              read: boolean;
              created_at: string;
            }>
          ).map((n) => {
            const Icon = TYPE_ICON[n.type] ?? TYPE_ICON.default;
            const content = (
              <div
                className={cn(
                  "flex items-start gap-3 p-3 rounded-2xl outline-1 transition w-full",
                  n.read ? "bg-card outline-black/5 opacity-70" : "bg-primary/5 outline-primary/20",
                )}
              >
                <div className="size-9 rounded-xl bg-primary/10 grid place-items-center shrink-0">
                  <Icon className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-snug">{n.title}</p>
                  {n.body && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                    {timeAgo(n.created_at)}
                  </p>
                </div>
                {!n.read && <div className="size-2 rounded-full bg-primary shrink-0 mt-2" />}
                {n.link && (
                  <ChevronRight className="size-4 text-muted-foreground shrink-0 self-center" />
                )}
              </div>
            );
            return n.link ? (
              <Link
                key={n.id}
                to={n.link as "/community"}
                onClick={() => {
                  if (!n.read) markReadMut.mutate(n.id);
                }}
              >
                {content}
              </Link>
            ) : (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.read) markReadMut.mutate(n.id);
                }}
                className="block w-full text-left"
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
