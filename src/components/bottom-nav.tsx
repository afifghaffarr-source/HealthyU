import { Link, useLocation } from "@tanstack/react-router";
import { Home, Camera, Database, Timer, Activity, User } from "lucide-react";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { SyncPill } from "@/components/healthyu/sync-pill";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listNotifications } from "@/features/scan/lib/scanBatch8.functions";

const items = [
  { to: "/dashboard", label: "Beranda", icon: Home },
  { to: "/scan", label: "Scan", icon: Camera },
  { to: "/foods", label: "Database", icon: Database },
  { to: "/fasting", label: "Puasa", icon: Timer },
  { to: "/workout", label: "Latihan", icon: Activity },
  { to: "/profile", label: "Saya", icon: User },
] as const;

export function BottomNav() {
  const location = useLocation();
  if (location.pathname.startsWith("/chat")) return null;
  return <BottomNavContent />;
}

/**
 * Inner content for BottomNav — kept in a separate component so all
 * hooks (useOfflineQueue, useServerFn, useQuery) are called unconditionally.
 * Rendering this is decided by the parent, so hook order is stable across
 * renders per the Rules of Hooks (react-hooks/rules-of-hooks).
 */
function BottomNavContent() {
  const { online, pending, sync } = useOfflineQueue();
  const fetchNotifs = useServerFn(listNotifications);
  const { data: notif } = useQuery({
    queryKey: ["notifications", "feed"],
    queryFn: () => fetchNotifs(),
    refetchInterval: 60000,
    staleTime: 30000,
  });
  const unread = (notif?.items ?? []).filter((n: { read?: boolean }) => !n.read).length;
  return (
    <>
      {(!online || pending > 0) && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 shadow-lg rounded-full lg:bottom-6 lg:left-28">
          <SyncPill online={online} pending={pending} onSync={() => sync()} />
        </div>
      )}

      {/* Mobile bottom bar */}
      <nav
        aria-label="Navigasi utama"
        className="fixed bottom-4 left-4 right-4 z-40 h-16 bg-card/90 backdrop-blur-xl rounded-3xl outline-1 outline-black/5 shadow-lg shadow-black/5 flex items-center justify-around px-2 max-w-md mx-auto lg:hidden"
      >
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            aria-label={label}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl text-muted-foreground transition-all duration-200 motion-safe:active:scale-90"
            activeProps={{
              className: "text-primary [&_.nav-dot]:opacity-100 [&_.nav-icon-wrap]:bg-primary/12",
            }}
          >
            <span className="nav-icon-wrap relative inline-flex size-8 items-center justify-center rounded-full transition-colors">
              <Icon className="size-5" strokeWidth={2.2} />
              {to === "/profile" && unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold grid place-items-center shadow">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </span>
            <span className="text-[10px] font-semibold">{label}</span>
            <span className="nav-dot size-1 rounded-full bg-primary opacity-0 transition-opacity" />
          </Link>
        ))}
      </nav>
    </>
  );
}
