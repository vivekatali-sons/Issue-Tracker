
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Cell, Pie, PieChart } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { useMasterData } from "@/hooks/use-master-data";
import type { Issue } from "@/lib/types";

const PROCESS_COLORS = ["#0f2b5b", "#c8a84e", "#3b82f6", "#10b981"];

const chartConfig = {
  count: { label: "Issues" },
} satisfies ChartConfig;

interface ProcessSummaryProps {
  issues: Issue[];
}

export function ProcessSummary({ issues }: ProcessSummaryProps) {
  const navigate = useNavigate();
  const { processes: masterProcesses } = useMasterData();
  const total = issues.length;

  const pieData = useMemo(() => {
    return masterProcesses.map((process, idx) => ({
      name: process.name,
      value: issues.filter((i) => i.processId === process.id).length,
      fill: PROCESS_COLORS[idx % PROCESS_COLORS.length],
    })).filter((d) => d.value > 0);
  }, [issues, masterProcesses]);

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
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
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
                    style={{ backgroundColor: PROCESS_COLORS[idx % PROCESS_COLORS.length] }}
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
