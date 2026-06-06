import { Link } from "@tanstack/react-router";
import { Camera, Sparkles, MessageCircle } from "lucide-react";

type Item = {
  to: string;
  label: string;
  Icon: typeof Camera;
};

const ITEMS: Item[] = [
  { to: "/scan", label: "Scan makanan", Icon: Camera },
  { to: "/recommendations", label: "Meal Plan AI", Icon: Sparkles },
  { to: "/chat", label: "AI Coach", Icon: MessageCircle },
];

export function ActionRow() {
  return (
    <nav aria-label="Aksi cepat" className="grid grid-cols-3 gap-2 animate-fade-up">
      {ITEMS.map(({ to, label, Icon }) => (
        <Link
          key={to}
          to={to}
          className="group flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-card outline-1 outline-black/5 dark:outline-white/10 hover:bg-primary/5 active:scale-[0.98] transition min-h-11"
        >
          <span className="size-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
            <Icon className="size-5" aria-hidden />
          </span>
          <span className="text-[12px] font-semibold">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
