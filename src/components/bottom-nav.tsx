import { Link } from "@tanstack/react-router";
import { Home, Utensils, Database, Timer, Activity, User } from "lucide-react";

const items = [
  { to: "/dashboard", label: "Beranda", icon: Home },
  { to: "/food", label: "Makanan", icon: Utensils },
  { to: "/foods", label: "Database", icon: Database },
  { to: "/fasting", label: "Puasa", icon: Timer },
  { to: "/workout", label: "Latihan", icon: Activity },
  { to: "/profile", label: "Saya", icon: User },
] as const;

export function BottomNav() {
  return (
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
  );
}