import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Plus, Camera, Utensils, Droplet, Dumbbell, X } from "lucide-react";

const ACTIONS = [
  { to: "/scan", label: "Scan", icon: Camera, color: "from-primary to-accent" },
  { to: "/foods", label: "Log makan", icon: Utensils, color: "from-amber-500 to-rose-500" },
  { to: "/water", label: "Air", icon: Droplet, color: "from-sky-500 to-cyan-400" },
  { to: "/workout", label: "Latihan", icon: Dumbbell, color: "from-violet-500 to-fuchsia-500" },
];

export function QuickActionFab() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  // Only show on authenticated app pages, not on landing
  if (loc.pathname === "/" || loc.pathname.startsWith("/auth")) return null;

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />}
      <div className="fixed bottom-24 right-5 z-40 flex flex-col items-end gap-2 lg:bottom-6">
        {open && ACTIONS.map((a, i) => (
          <Link
            key={a.to}
            to={a.to}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 animate-fade-up"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className="bg-card text-foreground text-xs font-semibold px-3 py-1.5 rounded-full shadow-md border border-border">{a.label}</span>
            <span className={`size-11 rounded-full bg-gradient-to-br ${a.color} text-white grid place-items-center shadow-lg`}>
              <a.icon className="size-5" />
            </span>
          </Link>
        ))}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Tutup aksi cepat" : "Buka aksi cepat"}
          className="size-14 rounded-full bg-gradient-to-br from-primary to-primary-dark text-primary-foreground shadow-xl shadow-primary/40 grid place-items-center hover:scale-105 transition-transform"
        >
          {open ? <X className="size-6" /> : <Plus className="size-6" />}
        </button>
      </div>
    </>
  );
}