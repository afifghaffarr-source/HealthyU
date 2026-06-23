import { Link, useNavigate } from "@tanstack/react-router";
import {
  Droplets,
  Utensils,
  Moon,
  Activity,
  Smile,
  Coffee,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

const ACTION_MAP: Record<
  string,
  { label: string; Icon: LucideIcon; href?: string; callback?: string }
> = {
  log_water: { label: "Minum air", Icon: Droplets, href: "/water" },
  log_meal: { label: "Catat makanan", Icon: Utensils, href: "/food" },
  start_fast: { label: "Mulai puasa", Icon: Coffee, href: "/fasting" },
  log_mood: { label: "Catat mood", Icon: Smile, href: "/mood" },
  log_sleep: { label: "Catat tidur", Icon: Moon, href: "/sleep" },
  log_workout: { label: "Mulai workout", Icon: Activity, href: "/workout" },
  review_meals: { label: "Review makan", Icon: BookOpen, href: "/reports" },
};

const PRIORITY_STYLES = {
  high: "bg-primary text-primary-foreground",
  medium: "bg-secondary/40 text-foreground",
  low: "bg-muted text-muted-foreground",
} as const;

export type ActionItem = {
  action: keyof typeof ACTION_MAP;
  label: string;
  target_value?: string;
  priority?: "low" | "medium" | "high";
};

/**
 * ActionPlanCard — Tappable action buttons from AI Coach.
 *
 * Each action navigates user to relevant page (log water, start fast, etc.)
 * Priority-based visual treatment: high=primary, medium=secondary, low=muted.
 */
export function ActionPlanCard({ actions }: { actions: ActionItem[] }) {
  const navigate = useNavigate();

  if (!actions || actions.length === 0) return null;

  return (
    <section className="bg-card p-4 rounded-2xl outline-1 outline-black/5 dark:outline-white/10 space-y-3">
      <div className="flex items-center gap-2">
        <div className="size-7 rounded-lg bg-primary/10 grid place-items-center text-primary">
          <BookOpen className="size-3.5" aria-hidden />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Action Plan</h3>
      </div>
      <div className="flex flex-col gap-2">
        {actions.map((item, i) => {
          const meta = ACTION_MAP[item.action];
          if (!meta) return null;
          const Icon = meta.Icon;
          const priority = item.priority ?? "medium";
          const onClick = meta.href ? () => void navigate({ to: meta.href! }) : undefined;
          const content = (
            <div className="flex items-center gap-3 w-full">
              <div
                className={`size-8 rounded-lg grid place-items-center shrink-0 ${
                  priority === "high"
                    ? "bg-white/20"
                    : priority === "medium"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted"
                }`}
              >
                <Icon className="size-4" aria-hidden />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold leading-tight">{item.label}</p>
                {item.target_value && (
                  <p className="text-[11px] opacity-70 mt-0.5">Target: {item.target_value}</p>
                )}
              </div>
              <span className="text-[10px] font-bold opacity-60">→</span>
            </div>
          );
          const className = `flex items-center w-full p-2.5 rounded-xl transition active:scale-[0.98] min-h-11 ${PRIORITY_STYLES[priority]}`;

          if (meta.href) {
            return (
              <Link
                key={`${item.action}-${i}`}
                to={meta.href}
                className={className}
                onClick={onClick}
              >
                {content}
              </Link>
            );
          }
          return (
            <button
              key={`${item.action}-${i}`}
              type="button"
              className={className}
              onClick={onClick}
            >
              {content}
            </button>
          );
        })}
      </div>
    </section>
  );
}
