import { Sparkles } from "lucide-react";

export function TakeawayBox({
  title = "Praktikkan hari ini",
  body,
  className = "",
}: {
  title?: string;
  body: string;
  className?: string;
}) {
  return (
    <aside
      role="note"
      aria-label="Takeaway praktis"
      className={`not-prose flex gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 outline-1 outline-emerald-500/30 ${className}`}
    >
      <div className="size-9 shrink-0 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 grid place-items-center text-emerald-700 dark:text-emerald-300">
        <Sparkles className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">{title}</p>
        <p className="text-[13px] leading-relaxed text-emerald-900/85 dark:text-emerald-100/85">
          {body}
        </p>
      </div>
    </aside>
  );
}
