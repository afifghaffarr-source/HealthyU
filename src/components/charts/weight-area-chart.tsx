import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from "recharts";

type Point = { date: string; kg: number };

export default function WeightAreaChart({ data, target }: { data: Point[]; target?: number }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" fontSize={10} />
        <YAxis fontSize={10} domain={["auto", "auto"]} />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="kg"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#wg)"
        />
        {target && (
          <ReferenceLine
            y={target}
            stroke="hsl(var(--destructive))"
            strokeDasharray="3 3"
            label="Target"
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
