
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDashboardStats, type AdminDashboardStats } from "@/lib/admin-api";
import {
  Users, UserCheck, UserX, FileText, AlertCircle, Clock,
  Flame, CheckCircle2, List, Gauge, Cog, ClipboardList, Loader2,
  Activity, ArrowUpRight,
} from "lucide-react";

interface MetricCard {
  title: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
  href?: string;
  accent?: boolean;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <AlertCircle className="h-8 w-8" />
        <p>Failed to load dashboard data.</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const userMetrics: MetricCard[] = [
    {
      title: "Total Users", value: stats.totalUsers,
      icon: <Users className="h-4.5 w-4.5" />,
      gradient: "from-blue-500/20 to-blue-600/10",
      iconBg: "text-blue-500 dark:text-blue-400",
      href: "/admin/users",
    },
    {
      title: "Active Users", value: stats.activeUsers,
      icon: <UserCheck className="h-4.5 w-4.5" />,
      gradient: "from-emerald-500/20 to-emerald-600/10",
      iconBg: "text-emerald-500 dark:text-emerald-400",
    },
    {
      title: "Blocked Users", value: stats.blockedUsers,
      icon: <UserX className="h-4.5 w-4.5" />,
      gradient: "from-red-500/20 to-red-600/10",
      iconBg: "text-red-500 dark:text-red-400",
      href: "/admin/users",
      accent: stats.blockedUsers > 0,
    },
  ];

  const issueMetrics: MetricCard[] = [
    {
      title: "Total Issues", value: stats.totalIssues,
      icon: <FileText className="h-4.5 w-4.5" />,
      gradient: "from-slate-500/20 to-slate-600/10",
      iconBg: "text-slate-500 dark:text-slate-400",
    },
    {
      title: "Open Issues", value: stats.openIssues,
      icon: <AlertCircle className="h-4.5 w-4.5" />,
      gradient: "from-amber-500/20 to-amber-600/10",
      iconBg: "text-amber-500 dark:text-amber-400",
    },
    {
      title: "Critical", value: stats.criticalIssues,
      icon: <Flame className="h-4.5 w-4.5" />,
      gradient: "from-red-500/20 to-red-600/10",
      iconBg: "text-red-500 dark:text-red-400",
      accent: stats.criticalIssues > 0,
    },
    {
      title: "Overdue", value: stats.overdueIssues,
      icon: <Clock className="h-4.5 w-4.5" />,
      gradient: "from-orange-500/20 to-orange-600/10",
      iconBg: "text-orange-500 dark:text-orange-400",
      accent: stats.overdueIssues > 0,
    },
    {
      title: "Resolved", value: stats.resolvedIssues,
      icon: <CheckCircle2 className="h-4.5 w-4.5" />,
      gradient: "from-teal-500/20 to-teal-600/10",
      iconBg: "text-teal-500 dark:text-teal-400",
    },
  ];

  const masterData: MetricCard[] = [
    {
      title: "Statuses", value: stats.activeStatuses,
      icon: <List className="h-4.5 w-4.5" />,
      gradient: "from-violet-500/20 to-violet-600/10",
      iconBg: "text-violet-500 dark:text-violet-400",
      href: "/admin/statuses",
    },
    {
      title: "Severities", value: stats.activeSeverities,
      icon: <Gauge className="h-4.5 w-4.5" />,
      gradient: "from-pink-500/20 to-pink-600/10",
      iconBg: "text-pink-500 dark:text-pink-400",
      href: "/admin/severities",
    },
    {
      title: "Processes", value: stats.activeProcesses,
      icon: <Cog className="h-4.5 w-4.5" />,
      gradient: "from-cyan-500/20 to-cyan-600/10",
      iconBg: "text-cyan-500 dark:text-cyan-400",
      href: "/admin/processes",
    },
    {
      title: "Tasks", value: stats.activeTasks,
      icon: <ClipboardList className="h-4.5 w-4.5" />,
      gradient: "from-indigo-500/20 to-indigo-600/10",
      iconBg: "text-indigo-500 dark:text-indigo-400",
      href: "/admin/tasks",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-[#0f2b5b] via-[#132e5a] to-[#183660] p-6 text-white dark:from-[#141414] dark:via-[#181818] dark:to-[#1c1c1c] dark:border-border/50">
        {/* Decorative elements */}
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#d4af5a]/8 blur-3xl" />
        <div className="absolute right-12 bottom-0 h-24 w-24 rounded-full bg-[#d4af5a]/5 blur-2xl" />
        <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-[#d4af5a]/5 to-transparent" />

        <div className="relative z-10 flex items-start justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="flex h-6 items-center gap-1.5 rounded-full bg-[#d4af5a]/15 px-2.5 text-[#d4af5a]">
                <Activity className="h-3 w-3" />
                <span className="text-[10px] font-semibold uppercase tracking-widest">System Overview</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Admin Dashboard</h2>
            <p className="text-sm text-white/50 font-medium">
              {stats.totalIssues.toLocaleString()} total issues tracked &middot; {stats.activeUsers} active users
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-6 text-right">
            <div>
              <p className="text-2xl font-bold text-[#d4af5a]">{stats.openIssues}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">Open</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="text-2xl font-bold text-white/90">{stats.resolvedIssues}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">Resolved</p>
            </div>
          </div>
        </div>
      </div>

      {/* User Metrics */}
      <section>
        <SectionHeader title="Users" subtitle="User accounts and access" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {userMetrics.map((m) => (
            <MetricCardView key={m.title} metric={m} onClick={m.href ? () => navigate(m.href!) : undefined} />
          ))}
        </div>
      </section>

      {/* Issue Metrics */}
      <section>
        <SectionHeader title="Issues" subtitle="Issue tracking metrics" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {issueMetrics.map((m) => (
            <MetricCardView key={m.title} metric={m} />
          ))}
        </div>
      </section>

      {/* Master Data */}
      <section>
        <SectionHeader title="Master Data" subtitle="Configuration items" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {masterData.map((m) => (
            <MetricCardView key={m.title} metric={m} onClick={m.href ? () => navigate(m.href!) : undefined} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <span className="text-[11px] text-muted-foreground">{subtitle}</span>
    </div>
  );
}

function MetricCardView({ metric, onClick }: { metric: MetricCard; onClick?: () => void }) {
  return (
    <div
      className={`
        group relative overflow-hidden rounded-xl
        border bg-card
        p-4 transition-all duration-200 ease-out
        hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/30
        hover:-translate-y-0.5
        ${onClick ? "cursor-pointer hover:border-primary/20" : "border-border/50 hover:border-border"}
        ${metric.accent ? "border-red-500/20 dark:border-red-400/15" : "border-border/50"}
      `}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Icon with soft gradient bg */}
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${metric.gradient} ${metric.iconBg}`}>
          {metric.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-muted-foreground truncate">{metric.title}</p>
          <p className="text-xl font-bold tracking-tight leading-none mt-0.5">{metric.value.toLocaleString()}</p>
        </div>
        {onClick && (
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/0 group-hover:text-muted-foreground transition-all duration-200 -translate-x-1 translate-y-1 group-hover:translate-x-0 group-hover:translate-y-0" />
        )}
      </div>
    </div>
  );
}
