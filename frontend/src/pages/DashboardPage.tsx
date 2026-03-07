
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  AlertCircle,
  Clock,
  AlertTriangle,
  CalendarClock,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { useIssues } from "@/hooks/use-issues";
import { isIssueOverdue } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/stat-card";
import { IssuesTrendChart } from "@/components/dashboard/issues-trend-chart";
import { StatusByProcessChart } from "@/components/dashboard/status-by-process-chart";
import { StatusSummary } from "@/components/dashboard/status-summary";
import { ProcessSummary } from "@/components/dashboard/process-summary";
import { OverdueTable } from "@/components/dashboard/overdue-table";

export default function DashboardPage() {
  const { issues } = useIssues();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(startOfToday.getDate() + (7 - startOfToday.getDay()));

    return {
      total: issues.length,
      open: issues.filter((i) => i.status !== "Resolved" && i.status !== "Closed").length,
      inProgress: issues.filter((i) => i.status === "In Progress").length,
      overdue: issues.filter(isIssueOverdue).length,
      dueThisWeek: issues.filter((i) => {
        if (!i.dueDate || i.status === "Resolved" || i.status === "Closed") return false;
        const due = new Date(i.dueDate);
        const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
        return dueDay >= startOfToday && dueDay <= endOfWeek;
      }).length,
      reopened: issues.filter((i) => i.reopenCount > 0).length,
      resolved: issues.filter((i) => i.status === "Resolved" || i.status === "Closed").length,
    };
  }, [issues]);

  return (
    <div className="space-y-8">
      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard
          title="Total Issues"
          value={stats.total}
          icon={<LayoutDashboard className="h-4 w-4 text-slate-500 dark:text-slate-400" />}
          accentColor="bg-slate-500"
          numberColor="text-slate-800 dark:text-slate-100"
          className="bg-slate-50/40 stat-glow-slate"
          onClick={() => navigate("/issues")}
        />
        <StatCard
          title="Open"
          value={stats.open}
          icon={<AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />}
          accentColor="bg-orange-600"
          numberColor="text-orange-900 dark:text-orange-300"
          className="bg-orange-50/40 stat-glow-orange"
          onClick={() => navigate("/open-issues")}
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          icon={<Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
          accentColor="bg-emerald-600"
          numberColor="text-emerald-900 dark:text-emerald-300"
          className="bg-emerald-50/40 stat-glow-emerald"
          onClick={() => navigate("/issues?status=In+Progress")}
        />
        <StatCard
          title="Overdue"
          value={stats.overdue}
          icon={<AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />}
          accentColor="bg-red-600"
          numberColor="text-red-900 dark:text-red-300"
          className="bg-red-50/40 stat-glow-red"
          onClick={() => navigate("/issues?overdue=true")}
        />
        <StatCard
          title="Due This Week"
          value={stats.dueThisWeek}
          icon={<CalendarClock className="h-4 w-4 text-amber-500 dark:text-amber-400" />}
          accentColor="bg-amber-500"
          numberColor="text-amber-800 dark:text-amber-300"
          className="bg-amber-50/40 stat-glow-amber"
          onClick={() => navigate("/issues?dueThisWeek=true")}
        />
        <StatCard
          title="Resolved"
          value={stats.resolved}
          icon={<CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />}
          accentColor="bg-teal-600"
          numberColor="text-teal-900 dark:text-teal-300"
          className="bg-teal-50/40 stat-glow-teal"
          onClick={() => navigate("/resolved")}
        />
        <StatCard
          title="Reopened"
          value={stats.reopened}
          icon={<RotateCcw className="h-4 w-4 text-violet-600 dark:text-violet-400" />}
          accentColor="bg-violet-600"
          numberColor="text-violet-900 dark:text-violet-300"
          className="bg-violet-50/40 stat-glow-violet"
          onClick={() => navigate("/issues?reopened=true")}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <IssuesTrendChart issues={issues} />
        <StatusByProcessChart issues={issues} />
      </div>

      {/* Overdue Issues — full width */}
      <OverdueTable issues={issues} />

      {/* Summary Panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StatusSummary issues={issues} />
        <ProcessSummary issues={issues} />
      </div>
    </div>
  );
}
