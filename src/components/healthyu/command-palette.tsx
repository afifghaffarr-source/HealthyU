import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";

const ROUTES: { label: string; to: string; hint?: string }[] = [
  { label: "Beranda", to: "/dashboard", hint: "Dashboard" },
  { label: "Scan makanan", to: "/scan" },
  { label: "Database makanan", to: "/foods" },
  { label: "Puasa", to: "/fasting" },
  { label: "Jadwal sholat", to: "/prayer" },
  { label: "Kompas kiblat", to: "/prayer/qibla" },
  { label: "Latihan", to: "/workout" },
  { label: "Timer workout", to: "/workout/timer" },
  { label: "Berat badan", to: "/weight" },
  { label: "Chart berat", to: "/weight/chart" },
  { label: "Body metrics", to: "/body" },
  { label: "Air minum", to: "/water" },
  { label: "Tidur", to: "/sleep" },
  { label: "Mood", to: "/mood" },
  { label: "Resep", to: "/recipes" },
  { label: "Meal plan", to: "/mealplan" },
  { label: "Shopping list", to: "/shopping/list" },
  { label: "AI Coach (chat)", to: "/chat" },
  { label: "Dr. Healthy", to: "/coach" },
  { label: "Profil saya", to: "/profile" },
  { label: "Achievements", to: "/achievements" },
  { label: "Leaderboard", to: "/leaderboard" },
  { label: "Tantangan", to: "/challenges" },
  { label: "Grup teman", to: "/groups" },
  { label: "Reward & koin", to: "/rewards" },
  { label: "Pet evolution", to: "/pet" },
  { label: "Notifikasi", to: "/notifications" },
  { label: "Reminder", to: "/reminders" },
  { label: "Laporan mingguan", to: "/reports/weekly" },
  { label: "Pengaturan tema", to: "/theme" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return ROUTES.slice(0, 12);
    return ROUTES.filter(
      (r) => r.label.toLowerCase().includes(needle) || r.to.includes(needle),
    ).slice(0, 20);
  }, [q]);

  useEffect(() => {
    setIdx(0);
  }, [q, open]);

  if (!open) return null;

  const go = (to: string) => {
    setOpen(false);
    setQ("");
    navigate({ to });
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-24 px-4 animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 border-b border-border">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIdx((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIdx((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && filtered[idx]) {
                go(filtered[idx].to);
              }
            }}
            placeholder="Cari halaman… (Esc untuk tutup)"
            className="flex-1 bg-transparent py-3 text-sm outline-none"
          />
          <button
            onClick={() => setOpen(false)}
            aria-label="Tutup"
            className="p-1 rounded hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
        <ul className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-sm text-muted-foreground text-center">
              Tidak ditemukan.
            </li>
          )}
          {filtered.map((r, i) => (
            <li key={r.to}>
              <button
                onMouseEnter={() => setIdx(i)}
                onClick={() => go(r.to)}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between ${i === idx ? "bg-primary/10 text-foreground" : "hover:bg-muted"}`}
              >
                <span>{r.label}</span>
                <span className="text-xs text-muted-foreground">{r.to}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="px-4 py-2 text-[10px] text-muted-foreground border-t border-border flex justify-between">
          <span>↑↓ navigasi · ↵ buka</span>
          <span>⌘/Ctrl + K</span>
        </div>
      </div>
    </div>
  );
}
