
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { useMasterData } from "@/hooks/use-master-data";
import { useTheme } from "@/hooks/use-theme";
import { PROCESS_CHART_COLORS } from "@/lib/colors";
import type { Issue } from "@/lib/types";

const chartConfig = {
  count: { label: "Issues" },
} satisfies ChartConfig;

interface ProcessSummaryProps {
  issues: Issue[];
}

export function ProcessSummary({ issues }: ProcessSummaryProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const palette = isDark ? PROCESS_CHART_COLORS.dark : PROCESS_CHART_COLORS.light;
  const { processes: masterProcesses } = useMasterData();
  const total = issues.length;

  const pieData = useMemo(() => {
    return masterProcesses.map((process, idx) => ({
      name: process.name,
      value: issues.filter((i) => i.processId === process.id).length,
      fill: palette[idx % palette.length],
    })).filter((d) => d.value > 0);
  }, [issues, masterProcesses, palette]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold text-foreground">Issues by Process</CardTitle>
        <CardDescription className="text-xs">Click to filter by module</CardDescription>
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
                    if (entry) {
                      const proc = masterProcesses.find(p => p.name === entry.name);
                      if (proc) navigate(`/issues?process=${proc.id}`);
                    }
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

        {/* Process List */}
        <div className="space-y-1">
          {masterProcesses.map((process, idx) => {
            const count = issues.filter((i) => i.processId === process.id).length;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;

            return (
              <button
                key={process.id}
                onClick={() => navigate(`/issues?process=${process.id}`)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-150 hover:bg-muted cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: palette[idx % palette.length] }}
                  />
                  <span className="text-foreground">{process.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{pct}%</span>
                  <span className="min-w-[24px] text-right font-bold tabular-nums">{count}</span>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
