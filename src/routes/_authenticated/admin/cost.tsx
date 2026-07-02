import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { getAiCostStats } from "@/features/admin/lib/adminCost.functions";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin/cost")({
  component: AdminCostPage,
});

function AdminCostPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "cost"],
    queryFn: () => getAiCostStats(),
    staleTime: 60_000, // 1 min
  });

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4">
        <p className="text-sm font-semibold text-destructive mb-1">Failed to load cost data</p>
        <p className="text-sm text-destructive/90 font-mono">{(error as Error).message}</p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted/30 rounded-2xl animate-pulse" />
        <div className="h-64 bg-muted/30 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const { dailySpend, monthTotal, threshold } = data;
  const isOverThreshold = monthTotal >= threshold;
  const percentOfThreshold = (monthTotal / threshold) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Cost Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor AI usage costs and daily spending trends
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Month Total */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <DollarSign className="size-4" />
            <span className="text-sm font-medium">Current Month Total</span>
          </div>
          <div className="text-3xl font-bold">${monthTotal.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {percentOfThreshold.toFixed(0)}% of threshold
          </p>
        </div>

        {/* Threshold */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <AlertCircle className="size-4" />
            <span className="text-sm font-medium">Alert Threshold</span>
          </div>
          <div className="text-3xl font-bold">${threshold.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">Configurable in /admin/config</p>
        </div>

        {/* Status */}
        <div
          className={`border rounded-2xl p-4 ${
            isOverThreshold
              ? "bg-destructive/10 border-destructive/30"
              : "bg-emerald-500/10 border-emerald-500/30"
          }`}
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="size-4" />
            <span className="text-sm font-medium">Status</span>
          </div>
          <div
            className={`text-3xl font-bold ${
              isOverThreshold ? "text-destructive" : "text-emerald-600"
            }`}
          >
            {isOverThreshold ? "Over" : "Under"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            ${Math.abs(monthTotal - threshold).toFixed(2)} {isOverThreshold ? "over" : "under"}{" "}
            threshold
          </p>
        </div>
      </div>

      {/* Daily Spend Chart */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Daily Spend (Last 7 Days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailySpend}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => {
                const d = new Date(date);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
              className="text-xs"
            />
            <YAxis tickFormatter={(value) => `$${value.toFixed(2)}`} className="text-xs" />
            <Tooltip
              formatter={(value: number) => [`$${value.toFixed(4)}`, "Cost"]}
              labelFormatter={(date) => new Date(date as string).toLocaleDateString("id-ID")}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
              }}
            />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info */}
      <div className="bg-muted/30 border border-border rounded-xl p-4 text-sm">
        <p className="font-medium mb-2">Notes:</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>• Only non-cached requests are counted (cache_hit=false)</li>
          <li>• Threshold can be adjusted in Admin → Config (key: ai.cost_alert_threshold_usd)</li>
          <li>• Daily alerts run at 9am via cron job (healthyu-cost-alert)</li>
        </ul>
      </div>
    </div>
  );
}
