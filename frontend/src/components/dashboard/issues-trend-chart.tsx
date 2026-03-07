
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useTheme } from "@/hooks/use-theme";
import type { Issue } from "@/lib/types";

/* Light = corporate navy-blue   |   Dark = vibrant cyan→violet */
const THEME = {
  light: { stroke: "#1e40af", fill: "#3b82f6", fillEnd: "#3b82f6", dot: "#1e40af" },
  dark:  { stroke: "#38bdf8", fill: "#38bdf8", fillEnd: "#818cf8", dot: "#818cf8" },
} as const;

interface IssuesTrendChartProps {
  issues: Issue[];
}

export function IssuesTrendChart({ issues }: IssuesTrendChartProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const t = isDark ? THEME.dark : THEME.light;

  const chartConfig = useMemo(() => ({
    count: { label: "Issues", color: t.stroke },
  }) satisfies ChartConfig, [t]);

  const data = useMemo(() => {
    const months: { month: string; count: number; key: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;
      const count = issues.filter((issue) => {
        const created = new Date(issue.createdAt);
        return created.getFullYear() === year && created.getMonth() === month;
      }).length;
      months.push({ month: label, count, key });
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
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} style={{ cursor: "pointer" }}
            onClick={(state: any) => {
              if (!state) return;
              const payload = state?.activePayload?.[0]?.payload;
              if (payload?.key) { navigate(`/issues?month=${payload.key}`); return; }
              if (state.activeLabel) {
                const match = data.find((d) => d.month === state.activeLabel);
                if (match?.key) navigate(`/issues?month=${match.key}`);
              }
            }}>
            <defs>
              <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={t.fill} stopOpacity={isDark ? 0.4 : 0.25} />
                <stop offset="100%" stopColor={t.fillEnd} stopOpacity={0.02} />
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
              stroke={t.stroke}
              strokeWidth={2.5}
              fill="url(#fillCount)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, fill: t.dot, stroke: t.stroke, style: { cursor: "pointer" } }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
