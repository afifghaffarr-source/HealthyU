import { TrendingUp } from "lucide-react";

type BpPoint = { id: string; systolic: number; diastolic: number; logged_at: string };

export function BpTrendChart({ recentBp }: { recentBp: BpPoint[] }) {
  if (recentBp.length < 2) return null;
  const bpMax = Math.max(160, ...recentBp.map((r) => r.systolic ?? 0));
  const bpMin = Math.min(60, ...recentBp.map((r) => r.diastolic ?? 0));
  const stepX = recentBp.length > 1 ? 280 / (recentBp.length - 1) : 0;
  const range = Math.max(1, bpMax - bpMin);
  const sysPts = recentBp
    .map((r, i) => `${i * stepX},${80 - ((r.systolic - bpMin) / range) * 70 - 5}`)
    .join(" ");
  const diaPts = recentBp
    .map((r, i) => `${i * stepX},${80 - ((r.diastolic - bpMin) / range) * 70 - 5}`)
    .join(" ");
  return (
    <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <TrendingUp className="size-3" /> Tren tekanan darah
        </div>
        <span className="text-[10px] text-muted-foreground">{recentBp.length} catatan</span>
      </div>
      <svg viewBox="0 0 280 80" className="w-full h-20">
        <polyline
          points={sysPts}
          fill="none"
          stroke="hsl(var(--coral, 0 80% 65%))"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <polyline
          points={diaPts}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeDasharray="4 3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {recentBp.map((r, i) => (
          <g key={r.id}>
            <circle
              cx={i * stepX}
              cy={80 - ((r.systolic - bpMin) / range) * 70 - 5}
              r="2.5"
              className="fill-coral"
            />
            <circle
              cx={i * stepX}
              cy={80 - ((r.diastolic - bpMin) / range) * 70 - 5}
              r="2"
              className="fill-primary"
            />
          </g>
        ))}
      </svg>
      <div className="flex items-center justify-center gap-4 text-[10px] mt-1">
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-coral" /> Sistolik
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-primary" /> Diastolik
        </span>
      </div>
    </section>
  );
}
