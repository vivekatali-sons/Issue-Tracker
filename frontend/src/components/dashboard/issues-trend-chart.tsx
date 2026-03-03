
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Issue } from "@/lib/types";

const chartConfig = {
  count: {
    label: "Issues",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

interface IssuesTrendChartProps {
  issues: Issue[];
}

export function IssuesTrendChart({ issues }: IssuesTrendChartProps) {
  const data = useMemo(() => {
    const months: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const count = issues.filter((issue) => {
        const created = new Date(issue.createdAt);
        return created.getFullYear() === year && created.getMonth() === month;
      }).length;
      months.push({ month: label, count });
    }
    return months;
  }, [issues]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">
          Issues Trend
        </CardTitle>
        <CardDescription className="text-xs">Last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
            <XAxis
              dataKey="month"
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
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              fill="url(#fillCount)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, fill: "var(--card)" }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
