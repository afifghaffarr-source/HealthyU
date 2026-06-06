import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";

type Datum = { name: string; value: number; fill: string };

export default function ProgressRadialChart({ data }: { data: Datum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadialBarChart
        innerRadius="30%"
        outerRadius="100%"
        data={data}
        startAngle={90}
        endAngle={-270}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
        <RadialBar background dataKey="value" cornerRadius={8} />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}
