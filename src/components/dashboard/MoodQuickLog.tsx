import { Link } from "@tanstack/react-router";
import { Smile } from "lucide-react";

const EMOJI = ["😢", "😕", "😐", "🙂", "😄"] as const;

export function MoodQuickLog({
  onPick,
  disabled,
}: {
  onPick: (mood: number) => void;
  disabled?: boolean;
}) {
  return (
    <Link
      to="/mood"
      className="bg-card p-4 rounded-3xl outline-1 outline-black/5 shadow-sm flex items-center gap-3 animate-fade-up"
    >
      <div className="size-12 rounded-2xl bg-amber-100 grid place-items-center">
        <Smile className="size-5 text-amber-600" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
          Mood hari ini
        </p>
        <div className="flex gap-1 mt-1">
          {[1, 2, 3, 4, 5].map((m) => (
            <button
              key={m}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPick(m);
              }}
              disabled={disabled}
              className="text-xl hover:scale-125 transition-transform"
              aria-label={`Mood ${m}`}
            >
              {EMOJI[m - 1]}
            </button>
          ))}
        </div>
      </div>
    </Link>
  );
}