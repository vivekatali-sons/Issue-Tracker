
import { LayoutDashboard, AlertCircle, Flame, AlertTriangle, CheckCircle2 } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";

interface IssuesKpiStripProps {
  total: number;
  open: number;
  critical: number;
  overdue: number;
  resolved: number;
  onTotalClick?: () => void;
  onOpenClick?: () => void;
  onCriticalClick?: () => void;
  onOverdueClick?: () => void;
  onResolvedClick?: () => void;
}

export function IssuesKpiStrip({ total, open, critical, overdue, resolved, onTotalClick, onOpenClick, onCriticalClick, onOverdueClick, onResolvedClick }: IssuesKpiStripProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard
        title="Total Issues"
        value={total}
        icon={<LayoutDashboard className="h-4 w-4 text-slate-500" />}
        accentColor="bg-slate-500"
        numberColor="text-slate-800"
        className="bg-slate-50/40"
        onClick={onTotalClick}
      />
      <StatCard
        title="Active"
        value={open}
        icon={<AlertCircle className="h-4 w-4 text-emerald-600" />}
        accentColor="bg-emerald-600"
        numberColor="text-emerald-900"
        className="bg-emerald-50/40"
        onClick={onOpenClick}
      />
      <StatCard
        title="Critical"
        value={critical}
        icon={<Flame className="h-4 w-4 text-red-600" />}
        accentColor="bg-red-600"
        numberColor="text-red-900"
        className="bg-red-50/40"
        onClick={onCriticalClick}
      />
      <StatCard
        title="Overdue"
        value={overdue}
        icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
        accentColor="bg-amber-500"
        numberColor="text-amber-800"
        className="bg-amber-50/40"
        onClick={onOverdueClick}
      />
      <StatCard
        title="Resolved"
        value={resolved}
        icon={<CheckCircle2 className="h-4 w-4 text-teal-600" />}
        accentColor="bg-teal-600"
        numberColor="text-teal-900"
        className="bg-teal-50/40"
        onClick={onResolvedClick}
      />
    </div>
  );
}
