
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useMasterData } from "@/hooks/use-master-data";
import { useTheme } from "@/hooks/use-theme";
import { BAR_CHART_COLORS } from "@/lib/colors";
import type { Issue } from "@/lib/types";

interface StatusByProcessChartProps {
  issues: Issue[];
}

export function StatusByProcessChart({ issues }: StatusByProcessChartProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { processes: masterProcesses } = useMasterData();

  const colors = useMemo(() => ({
    new: isDark ? BAR_CHART_COLORS.new.dark : BAR_CHART_COLORS.new.light,
    inProgress: isDark ? BAR_CHART_COLORS.inProgress.dark : BAR_CHART_COLORS.inProgress.light,
    resolved: isDark ? BAR_CHART_COLORS.resolved.dark : BAR_CHART_COLORS.resolved.light,
  }), [isDark]);

  const chartConfig = useMemo(() => ({
    new: { label: "New", color: colors.new },
    inProgress: { label: "In Progress", color: colors.inProgress },
    resolved: { label: "Resolved", color: colors.resolved },
  }) satisfies ChartConfig, [colors]);

  const data = useMemo(() => {
    return masterProcesses.map((process) => {
      const processIssues = issues.filter((i) => i.processId === process.id);
      return {
        process: process.name.replace(" Module", ""),
        processId: process.id,
        new: processIssues.filter((i) => i.status === "New" || i.status === "Reopened").length,
        inProgress: processIssues.filter((i) => i.status === "In Progress" || i.status === "Testing").length,
        resolved: processIssues.filter((i) => i.status === "Resolved" || i.status === "Closed").length,
      };
    });
  }, [issues, masterProcesses]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">
          Status by Process
        </CardTitle>
        <CardDescription className="text-xs">Issue distribution across modules</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
            <XAxis
              dataKey="process"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              dy={4}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              width={32}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
            />
            <Bar dataKey="new" stackId="a" fill={colors.new} radius={[0, 0, 0, 0]} style={{ cursor: "pointer" }}
              onClick={(data: any) => { if (data?.processId) navigate(`/issues?process=${data.processId}`); }} />
            <Bar dataKey="inProgress" stackId="a" fill={colors.inProgress} style={{ cursor: "pointer" }}
              onClick={(data: any) => { if (data?.processId) navigate(`/issues?process=${data.processId}`); }} />
            <Bar dataKey="resolved" stackId="a" fill={colors.resolved} radius={[4, 4, 0, 0]} style={{ cursor: "pointer" }}
              onClick={(data: any) => { if (data?.processId) navigate(`/issues?process=${data.processId}`); }} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
