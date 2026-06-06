import { Lightbulb } from "lucide-react";

export function DailyTipCard({ category, tip }: { category: string; tip: string }) {
  return (
    <div className="bg-card p-4 rounded-3xl outline-1 outline-black/5 shadow-sm flex items-start gap-3 animate-fade-up">
      <div className="size-10 rounded-2xl bg-amber-100 grid place-items-center shrink-0">
        <Lightbulb className="size-5 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
          Tip hari ini · {category}
        </p>
        <p className="text-sm font-medium mt-0.5">{tip}</p>
      </div>
    </div>
  );
}
