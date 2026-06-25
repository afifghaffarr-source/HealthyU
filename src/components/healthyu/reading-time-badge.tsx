import { Clock } from "lucide-react";

export function ReadingTimeBadge({ minutes }: { minutes: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-xs font-semibold">
      <Clock className="size-3" aria-hidden />
      {minutes} menit baca
    </span>
  );
}
