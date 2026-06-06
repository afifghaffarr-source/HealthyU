import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";

type Point = { day: string; hours: number; score?: number };

export default function SleepAreaChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="sleepG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            fontSize: 12,
            border: "none",
            boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
          }}
          formatter={(v: number, n: string) => (n === "hours" ? [`${v}j`, "Durasi"] : [v, "Skor"])}
        />
        <Area
          type="monotone"
          dataKey="hours"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#sleepG)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
