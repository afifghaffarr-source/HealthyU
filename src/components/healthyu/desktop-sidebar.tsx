import { Link } from "@tanstack/react-router";
import { Home, Camera, Database, Timer, Activity, User, Sparkles } from "lucide-react";

const items = [
  { to: "/dashboard", label: "Beranda", icon: Home },
  { to: "/scan", label: "Scan", icon: Camera },
  { to: "/foods", label: "Database", icon: Database },
  { to: "/fasting", label: "Puasa", icon: Timer },
  { to: "/workout", label: "Latihan", icon: Activity },
  { to: "/coach", label: "AI Coach", icon: Sparkles },
  { to: "/profile", label: "Saya", icon: User },
] as const;

export function DesktopSidebar() {
  return (
    <aside
      aria-label="Navigasi samping"
      className="hidden lg:flex fixed left-4 top-4 bottom-4 z-40 w-56 flex-col gap-1 rounded-3xl bg-card/90 backdrop-blur-xl outline-1 outline-black/5 shadow-lg shadow-black/5 p-3"
    >
      <div className="px-3 py-2 mb-2">
        <span className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>
          HealthyU
        </span>
      </div>
      {items.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/60"
          activeProps={{ className: "bg-primary/12 text-primary" }}
        >
          <Icon className="size-5" strokeWidth={2.2} />
          <span>{label}</span>
        </Link>
      ))}
    </aside>
  );
}
