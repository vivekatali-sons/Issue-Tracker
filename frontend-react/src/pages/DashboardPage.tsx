
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Clock,
  AlertTriangle,
  CalendarClock,
  RotateCcw,
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
      inProgress: issues.filter((i) => i.status === "In Progress").length,
      overdue: issues.filter(isIssueOverdue).length,
      dueThisWeek: issues.filter((i) => {
        if (!i.dueDate || i.status === "Resolved" || i.status === "Closed") return false;
        const due = new Date(i.dueDate);
        const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
        return dueDay >= startOfToday && dueDay <= endOfWeek;
      }).length,
      reopened: issues.filter((i) => i.reopenCount > 0).length,
    };
  }, [issues]);

  return (
    <div className="space-y-8">
      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          title="Total Issues"
          value={stats.total}
          icon={<LayoutDashboard className="h-4 w-4 text-slate-500" />}
          accentColor="bg-slate-500"
          numberColor="text-slate-800"
          className="bg-slate-50/40"
          onClick={() => navigate("/issues")}
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          icon={<Clock className="h-4 w-4 text-emerald-600" />}
          accentColor="bg-emerald-600"
          numberColor="text-emerald-900"
          className="bg-emerald-50/40"
          onClick={() => navigate("/issues?status=In+Progress")}
        />
        <StatCard
          title="Overdue"
          value={stats.overdue}
          icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
          accentColor="bg-red-600"
          numberColor="text-red-900"
          className="bg-red-50/40"
          onClick={() => navigate("/issues?overdue=true")}
        />
        <StatCard
          title="Due This Week"
          value={stats.dueThisWeek}
          icon={<CalendarClock className="h-4 w-4 text-amber-500" />}
          accentColor="bg-amber-500"
          numberColor="text-amber-800"
          className="bg-amber-50/40"
          onClick={() => navigate("/issues?dueThisWeek=true")}
        />
        <StatCard
          title="Reopened"
          value={stats.reopened}
          icon={<RotateCcw className="h-4 w-4 text-violet-600" />}
          accentColor="bg-violet-600"
          numberColor="text-violet-900"
          className="bg-violet-50/40"
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
