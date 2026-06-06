import { Link } from "@tanstack/react-router";
import { BarChart3, ChefHat, ClipboardCheck, Flame, Timer, Utensils, type LucideIcon } from "lucide-react";

type QuickAction =
  | { label: string; icon: LucideIcon; to: "/food" | "/recommendations" | "/fasting" }
  | { label: string; icon: LucideIcon; prompt: string };

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Evaluasi hari ini",
    icon: ClipboardCheck,
    prompt:
      "Tolong evaluasi hari ini berdasarkan kalori, makro, air, puasa, dan aktivitas saya. Beri 1 saran konkret yang bisa saya lakukan sekarang.",
  },
  { label: "Log makanan", icon: Utensils, to: "/food" },
  { label: "Rekomendasi AI", icon: ChefHat, to: "/recommendations" },
  { label: "Mulai puasa", icon: Timer, to: "/fasting" },
  {
    label: "Budget kalori",
    icon: Flame,
    prompt: "Berapa sisa budget kalori saya hari ini? Berikan rekomendasi makanan.",
  },
];

export function ChatQuickActions({
  onPrompt,
  onReport,
  reportPending,
  sendDisabled,
}: {
  onPrompt: (text: string) => void;
  onReport: () => void;
  reportPending: boolean;
  sendDisabled: boolean;
}) {
  return (
    <div
      className="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1 pt-2 no-scrollbar [scrollbar-width:none]"
      style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
    >
      <button
        onClick={onReport}
        disabled={reportPending}
        className="shrink-0 rounded-2xl bg-primary/10 px-3 py-2 text-xs font-semibold whitespace-nowrap text-primary outline-1 outline-primary/30 disabled:opacity-50"
      >
        <span className="flex items-center gap-1.5">
          <BarChart3 className="size-3.5" />
          {reportPending ? "Membuat..." : "Laporan Mingguan"}
        </span>
      </button>
      {QUICK_ACTIONS.map((a) => {
        const Icon = a.icon;
        const content = (
          <span className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-card px-3 py-2 text-xs font-medium whitespace-nowrap outline-1 outline-black/10 transition hover:bg-secondary/40">
            <Icon className="size-3.5 text-primary" />
            {a.label}
          </span>
        );
        return "to" in a ? (
          <Link key={a.label} to={a.to} className="shrink-0">
            {content}
          </Link>
        ) : (
          <button
            key={a.label}
            onClick={() => onPrompt(a.prompt)}
            disabled={sendDisabled}
            className="shrink-0"
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}