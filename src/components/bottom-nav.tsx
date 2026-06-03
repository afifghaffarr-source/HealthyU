import { Link } from "@tanstack/react-router";
import { Home, Camera, Database, Timer, Activity, User, WifiOff, RefreshCw } from "lucide-react";
import { useOfflineQueue } from "@/hooks/use-offline-queue";

const items = [
  { to: "/dashboard", label: "Beranda", icon: Home },
  { to: "/scan", label: "Scan", icon: Camera },
  { to: "/foods", label: "Database", icon: Database },
  { to: "/fasting", label: "Puasa", icon: Timer },
  { to: "/workout", label: "Latihan", icon: Activity },
  { to: "/profile", label: "Saya", icon: User },
] as const;

export function BottomNav() {
  const { online, pending, sync } = useOfflineQueue();
  return (
    <>
      {(!online || pending > 0) && (
        <button
          onClick={() => sync()}
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-lg ${online ? "bg-amber-100 text-amber-700" : "bg-foreground text-background"}`}
          aria-label={online ? "Sync sekarang" : "Offline"}
        >
          {online ? <RefreshCw className="size-3" /> : <WifiOff className="size-3" />}
          {online ? `Sync ${pending}` : `Offline${pending ? ` · ${pending}` : ""}`}
        </button>
      )}
    <nav className="fixed bottom-4 left-4 right-4 z-40 h-16 bg-card/85 backdrop-blur-xl rounded-3xl outline-1 outline-black/5 shadow-lg shadow-black/5 flex items-center justify-around px-2 max-w-md mx-auto">
      {items.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl text-muted-foreground transition-colors"
          activeProps={{ className: "text-primary" }}
        >
          <Icon className="size-5" strokeWidth={2.2} />
          <span className="text-[10px] font-semibold">{label}</span>
        </Link>
      ))}
    </nav>
    </>
  );
}