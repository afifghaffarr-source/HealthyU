import { Link } from "@tanstack/react-router";
import { Clock, Flame } from "lucide-react";

type T = {
  id: string;
  title: string;
  weekly_growth?: number | string | null;
  calories: number | string;
  prep_min: number | string;
};

export function TrendingStrip({ items }: { items: T[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
        🔥 Trending minggu ini
      </p>
      <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-1">
        {items.map((r) => (
          <Link
            key={r.id}
            to="/recipes/$id"
            params={{ id: r.id }}
            className="shrink-0 w-48 bg-card p-3 rounded-2xl outline-1 outline-orange-200"
          >
            <p className="font-bold text-sm line-clamp-1">{r.title}</p>
            <p className="text-[10px] text-orange-600 font-bold mt-1">
              +{r.weekly_growth} bookmark / 7 hari
            </p>
            <div className="flex gap-2 mt-2 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Flame className="size-3" />
                {r.calories}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" />
                {r.prep_min}m
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}