
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { StatusBadge } from "@/components/issues/status-badge";
import { useMasterData } from "@/hooks/use-master-data";
import { useTheme } from "@/hooks/use-theme";
import { STATUS_CHART_DARK_OVERRIDES } from "@/lib/colors";
import type { Issue } from "@/lib/types";

const chartConfig = {
  count: { label: "Issues" },
} satisfies ChartConfig;

interface StatusSummaryProps {
  issues: Issue[];
}

export function StatusSummary({ issues }: StatusSummaryProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { statuses: masterStatuses } = useMasterData();
  const total = issues.length;

  const pieData = useMemo(() => {
    return masterStatuses
      .map((s) => ({
        name: s.name,
        value: issues.filter((i) => i.status === s.name).length,
        fill: isDark ? (STATUS_CHART_DARK_OVERRIDES[s.chartColor] ?? s.chartColor) : s.chartColor,
      }))
      .filter((d) => d.value > 0);
  }, [issues, masterStatuses, isDark]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold text-foreground">Issues by Status</CardTitle>
        <CardDescription className="text-xs">Click to filter by status</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Donut Chart */}
        {total > 0 && (
          <div className="mb-4 flex justify-center">
            <ChartContainer config={chartConfig} className="h-[140px] w-[140px]">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                  style={{ cursor: "pointer" }}
                  onClick={(_: any, index: number) => {
                    const entry = pieData[index];
                    if (entry) navigate(`/issues?status=${encodeURIComponent(entry.name)}`);
                  }}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ payload }) => {
                    if (!payload?.[0]) return null;
                    const { name, value, fill } = payload[0].payload;
                    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                    return (
                      <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: fill }} />
                          <span className="font-medium">{name}</span>
                        </div>
                        <div className="mt-1 text-muted-foreground">{value} issues ({pct}%)</div>
                      </div>
                    );
                  }}
                />
                <text
                  x="50%"
                  y="48%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground text-2xl font-bold"
                >
                  {total}
                </text>
                <text
                  x="50%"
                  y="62%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  Total
                </text>
              </PieChart>
            </ChartContainer>
          </div>
        )}

        {/* Status List */}
        <div className="space-y-1">
          {masterStatuses.map((s) => {
            const count = issues.filter((i) => i.status === s.name).length;
            if (count === 0) return null;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const dotColor = isDark ? (STATUS_CHART_DARK_OVERRIDES[s.chartColor] ?? s.chartColor) : s.chartColor;

            return (
              <button
                key={s.name}
                onClick={() => navigate(`/issues?status=${encodeURIComponent(s.name)}`)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-150 hover:bg-muted cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: dotColor }}
                  />
                  <StatusBadge status={s.name} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{pct}%</span>
                  <span className="min-w-[24px] text-right text-sm font-bold tabular-nums">{count}</span>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
