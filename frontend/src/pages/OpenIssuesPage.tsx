
import { useMemo, useCallback, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { AlertCircle, Clock, Flame, AlertTriangle, CheckCircle2, Eye } from "lucide-react";
import { useIssues } from "@/hooks/use-issues";
import { useIssuesListState } from "@/hooks/use-issues-list-state";
import { useMasterData } from "@/hooks/use-master-data";
import { IssuesToolbar } from "@/components/issues/issues-toolbar";
import { IssuesTable } from "@/components/issues/issues-table";
import { IssuesCardGrid } from "@/components/issues/issues-card-grid";
import { IssuesPagination } from "@/components/issues/issues-pagination";
import { IssuesEmptyState } from "@/components/issues/issues-empty-state";
import { IssuesTableSkeleton } from "@/components/issues/issues-table-skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { isIssueOverdue, exportToCsv } from "@/lib/utils";
import type { Issue } from "@/lib/types";

export default function OpenIssuesPage() {
  return (
    <Suspense fallback={<IssuesTableSkeleton />}>
      <OpenIssuesContent />
    </Suspense>
  );
}

function OpenIssuesContent() {
  const { issues } = useIssues();
  const navigate = useNavigate();
  const { getProcessName, getTaskName, getUserName } = useMasterData();

  const openIssues = useMemo(
    () => issues.filter((i) => i.status !== "Resolved" && i.status !== "Closed"),
    [issues],
  );

  const state = useIssuesListState({ issues: openIssues });

  const filtered = state.filteredIssues;
  const kpis = useMemo(() => {
    const newCount = filtered.filter((i) => i.status === "New").length;
    const inProgress = filtered.filter((i) => i.status === "In Progress").length;
    const overdue = filtered.filter(isIssueOverdue).length;
    const critical = filtered.filter((i) => i.severity === "Critical").length;
    return { total: filtered.length, newCount, inProgress, overdue, critical };
  }, [filtered]);

  const renderActions = (issue: Issue) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild size="icon" className="h-7 w-7 bg-green-600 hover:bg-green-700 text-white">
            <Link to={`/issues/detail?id=${issue.id}`}>
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Resolve</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild variant="outline" size="icon" className="h-7 w-7">
            <Link to={`/issues/detail?id=${issue.id}`}>
              <Eye className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>View Details</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
          <AlertCircle className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Open Issues</h1>
          <p className="text-sm text-muted-foreground">
            {kpis.total} {kpis.total === 1 ? "issue" : "issues"} requiring attention
            {kpis.overdue > 0 && (
              <span className="text-red-600 font-medium"> &middot; {kpis.overdue} overdue</span>
            )}
          </p>
        </div>
      </div>

      {/* ── KPI Cards — open-issue-specific ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="New"
          value={kpis.newCount}
          icon={<AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
          accentColor="bg-blue-600"
          numberColor="text-blue-900 dark:text-blue-300"
          className="bg-blue-50/40 stat-glow-emerald"
          onClick={() => { state.clearFilters(); state.setStatusFilter("New"); }}
        />
        <StatCard
          title="In Progress"
          value={kpis.inProgress}
          icon={<Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
          accentColor="bg-emerald-600"
          numberColor="text-emerald-900 dark:text-emerald-300"
          className="bg-emerald-50/40 stat-glow-emerald"
          onClick={() => { state.clearFilters(); state.setStatusFilter("In Progress"); }}
        />
        <StatCard
          title="Critical"
          value={kpis.critical}
          icon={<Flame className="h-4 w-4 text-red-600 dark:text-red-400" />}
          accentColor="bg-red-600"
          numberColor="text-red-900 dark:text-red-300"
          className="bg-red-50/40 stat-glow-red"
          onClick={() => { state.clearFilters(); state.setSeverityFilter("Critical"); }}
        />
        <StatCard
          title="Overdue"
          value={kpis.overdue}
          icon={<AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />}
          accentColor="bg-amber-500"
          numberColor="text-amber-800 dark:text-amber-300"
          className="bg-amber-50/40 stat-glow-amber"
          onClick={() => navigate("/issues?overdue=true")}
        />
      </div>

      {/* ── Toolbar: Search + Filters + Sort + View Toggle (no status filter, no new issue btn) ── */}
      <IssuesToolbar
        search={state.search}
        onSearchChange={state.setSearch}
        statusFilter={state.statusFilter}
        onStatusFilterChange={state.setStatusFilter}
        severityFilter={state.severityFilter}
        onSeverityFilterChange={state.setSeverityFilter}
        processFilter={state.processFilter}
        onProcessFilterChange={state.setProcessFilter}
        dateRange={state.dateRange}
        onDateRangeChange={state.setDateRange}
        sortBy={state.sortBy}
        onSortChange={state.setSortBy}
        viewMode={state.viewMode}
        onViewModeChange={state.setViewMode}
        hasActiveFilters={state.hasActiveFilters}
        onClearFilters={state.clearFilters}
        totalFiltered={state.totalFiltered}
        hideStatusFilter
        onExport={useCallback(() => {
          const headers = ["ID", "Issue Title", "Process", "Task", "Owner", "Raised By", "Severity", "Status", "Issue Date", "Due Date", "Reopen Count"];
          const rows = state.filteredIssues.map((i) => [
            String(i.id), i.issueTitle, getProcessName(i.processId), getTaskName(i.taskId),
            getUserName(i.assignedTo), getUserName(i.issueRaisedBy), i.severity, i.status,
            i.issueDate ? format(new Date(i.issueDate), "dd MMM yyyy") : "",
            i.dueDate ? format(new Date(i.dueDate), "dd MMM yyyy") : "", String(i.reopenCount),
          ]);
          exportToCsv(`open-issues-export-${format(new Date(), "yyyy-MM-dd")}.csv`, headers, rows);
        }, [state.filteredIssues, getProcessName, getTaskName, getUserName])}
      />

      {/* ── Content: Table or Card Grid with action buttons ── */}
      {state.paginatedIssues.length === 0 ? (
        <IssuesEmptyState
          hasFilters={state.hasActiveFilters}
          onClearFilters={state.clearFilters}
        />
      ) : state.viewMode === "table" ? (
        <IssuesTable
          issues={state.paginatedIssues}
          sortBy={state.sortBy}
          sortDir={state.sortDir}
          onToggleSort={state.toggleSort}
          renderActions={renderActions}
        />
      ) : (
        <IssuesCardGrid issues={state.paginatedIssues} renderActions={renderActions} />
      )}

      {/* ── Pagination ── */}
      {state.totalFiltered > 0 && (
        <IssuesPagination
          page={state.page}
          pageSize={state.pageSize}
          totalFiltered={state.totalFiltered}
          totalPages={state.totalPages}
          onPageChange={state.setPage}
          onPageSizeChange={state.setPageSize}
        />
      )}
    </div>
  );
}
