/**
 * VolumeChart — pure SVG bar chart for weekly volume progression.
 * Lightweight (no library), responsive width.
 */
import { cn } from "@/lib/utils";

type WeekPoint = {
  week_start: string;
  volume_kg: number;
  sessions: number;
};

export function VolumeChart({ data, className }: { data: WeekPoint[]; className?: string }) {
  if (data.length === 0) {
    return (
      <div
        className={cn(
          "bg-muted/30 rounded-2xl p-6 text-center text-xs text-muted-foreground",
          className,
        )}
      >
        Belum ada data volume. Mulai latihan untuk track progress.
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.volume_kg), 1);
  const barWidth = 28;
  const gap = 8;
  const padding = 16;
  const chartHeight = 120;
  const totalWidth = data.length * (barWidth + gap) + padding * 2;

  return (
    <div className={cn("overflow-x-auto", className)}>
      <svg
        width={totalWidth}
        height={chartHeight + 50}
        viewBox={`0 0 ${totalWidth} ${chartHeight + 50}`}
        className="block"
      >
        {data.map((d, i) => {
          const h = (d.volume_kg / max) * chartHeight;
          const x = padding + i * (barWidth + gap);
          const y = chartHeight - h + 4;
          const labelY = chartHeight + 20;
          return (
            <g key={d.week_start}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(h, 2)}
                rx={4}
                className="fill-primary"
              />
              {d.sessions > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  className="fill-foreground text-[10px] font-semibold tabular-nums"
                >
                  {Math.round(d.volume_kg / 1000)}t
                </text>
              )}
              <text
                x={x + barWidth / 2}
                y={labelY}
                textAnchor="middle"
                className="fill-muted-foreground text-[9px]"
              >
                {formatShort(d.week_start)}
              </text>
              <text
                x={x + barWidth / 2}
                y={labelY + 12}
                textAnchor="middle"
                className="fill-muted-foreground text-[9px] tabular-nums"
              >
                {d.sessions}×
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function formatShort(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
