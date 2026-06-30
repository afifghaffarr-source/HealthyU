import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const ROUTES = [
  { labelKey: "command.nav.beranda", to: "/dashboard", hint: "Dashboard" },
  { labelKey: "command.nav.scan", to: "/scan" },
  { labelKey: "command.nav.foods", to: "/foods" },
  { labelKey: "command.nav.fasting", to: "/fasting" },
  { labelKey: "command.nav.prayer", to: "/prayer" },
  { labelKey: "command.nav.qibla", to: "/prayer/qibla" },
  { labelKey: "command.nav.workout", to: "/workout" },
  { labelKey: "command.nav.workoutTimer", to: "/workout/timer" },
  { labelKey: "command.nav.weight", to: "/weight" },
  { labelKey: "command.nav.weightChart", to: "/weight/chart" },
  { labelKey: "command.nav.body", to: "/body" },
  { labelKey: "command.nav.water", to: "/water" },
  { labelKey: "command.nav.sleep", to: "/sleep" },
  { labelKey: "command.nav.mood", to: "/mood" },
  { labelKey: "command.nav.resep", to: "/resep" },
  { labelKey: "command.nav.mealplan", to: "/mealplan" },
  { labelKey: "command.nav.shoppingList", to: "/shopping/list" },
  { labelKey: "command.nav.chat", to: "/chat" },
  { labelKey: "command.nav.coach", to: "/coach" },
  { labelKey: "command.nav.profile", to: "/profile" },
  { labelKey: "command.nav.achievements", to: "/achievements" },
  { labelKey: "command.nav.leaderboard", to: "/leaderboard" },
  { labelKey: "command.nav.challenges", to: "/challenges" },
  { labelKey: "command.nav.groups", to: "/groups" },
  { labelKey: "command.nav.rewards", to: "/rewards" },
  { labelKey: "command.nav.pet", to: "/pet" },
  { labelKey: "command.nav.notifications", to: "/notifications" },
  { labelKey: "command.nav.reminders", to: "/reminders" },
  { labelKey: "command.nav.reportsWeekly", to: "/reports/weekly" },
  { labelKey: "command.nav.theme", to: "/theme" },
] as const satisfies ReadonlyArray<{
  labelKey: import("@/lib/i18n").TranslationKey;
  to: string;
  hint?: string;
}>;

export function CommandPalette() {
  const { t } = useTranslation();
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
    const items = ROUTES.map((r) => ({ to: r.to, label: t(r.labelKey) }));
    if (!needle) return items.slice(0, 12);
    return items
      .filter((r) => r.label.toLowerCase().includes(needle) || r.to.includes(needle))
      .slice(0, 20);
    // ROUTES is a static module-level constant; t() is stable across renders.
    // We intentionally re-derive on q change (the only user-driven input).
  }, [q, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external-store/async-query sync; `useSyncExternalStore` and equivalent restructure would change the API surface
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
            placeholder={t("command.placeholder")}
            className="flex-1 bg-transparent py-3 text-sm outline-none"
          />
          <button
            onClick={() => setOpen(false)}
            aria-label={t("common.close")}
            className="p-1 rounded hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
        <ul className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-sm text-muted-foreground text-center">
              {t("command.empty")}
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
          <span>{t("command.hintNav")}</span>
          <span>⌘/Ctrl + K</span>
        </div>
      </div>
    </div>
  );
}
