
import { useMemo, useState, useCallback, Suspense } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { AlertTriangle, CalendarClock, RotateCcw, Filter, X } from "lucide-react";
import { BulkUploadDialog } from "@/components/issues/bulk-upload-dialog";
import { useIssues } from "@/hooks/use-issues";
import { useIssuesListState } from "@/hooks/use-issues-list-state";
import { useMasterData } from "@/hooks/use-master-data";
import { IssuesKpiStrip } from "@/components/issues/issues-kpi-strip";
import { IssuesToolbar } from "@/components/issues/issues-toolbar";
import { IssuesTable } from "@/components/issues/issues-table";
import { IssuesCardGrid } from "@/components/issues/issues-card-grid";
import { IssuesPagination } from "@/components/issues/issues-pagination";
import { IssuesEmptyState } from "@/components/issues/issues-empty-state";
import { IssuesTableSkeleton } from "@/components/issues/issues-table-skeleton";
import { Button } from "@/components/ui/button";
import { exportToCsv } from "@/lib/utils";
import type { Status } from "@/lib/types";
import type { DateRange } from "@/components/issues/issues-toolbar";

export default function AllIssuesPage() {
  return (
    <Suspense fallback={<IssuesTableSkeleton />}>
      <AllIssuesContent />
    </Suspense>
  );
}

function AllIssuesContent() {
  const { issues } = useIssues();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const { getProcessName, getTaskName, getUserName } = useMasterData();

  const isReopenedFilter = searchParams.get("reopened") === "true";
  const isOverdueFilter = searchParams.get("overdue") === "true";
  const isDueThisWeekFilter = searchParams.get("dueThisWeek") === "true";
  const statusParam = searchParams.get("status") as Status | null;
  const processParam = searchParams.get("process");
  const monthParam = searchParams.get("month"); // YYYY-MM format

  const hasUrlFilter = isReopenedFilter || isOverdueFilter || isDueThisWeekFilter || !!statusParam || !!processParam || !!monthParam;

  // Compute initial date range from URL params (for "Due This Week" drill-down)
  const initialDateRange = useMemo<DateRange | undefined>(() => {
    if (isDueThisWeekFilter) {
      const now = new Date();
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
      return { from: now, to: endOfWeek };
    }
    return undefined;
  }, [isDueThisWeekFilter]);

  const activeFilterLabel = isOverdueFilter
    ? "Overdue Issues"
    : isDueThisWeekFilter
      ? "Due This Week"
      : isReopenedFilter
        ? "Reopened Issues"
        : monthParam
          ? `Month: ${new Date(monthParam + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
          : (statusParam && processParam)
            ? `${getProcessName(processParam)} — ${statusParam}`
            : statusParam
              ? `Status: ${statusParam}`
              : processParam
                ? `Process: ${getProcessName(processParam)}`
                : null;

  const activeFilterIcon = isOverdueFilter
    ? <AlertTriangle className="h-4 w-4" />
    : isDueThisWeekFilter
      ? <CalendarClock className="h-4 w-4" />
      : isReopenedFilter
        ? <RotateCcw className="h-4 w-4" />
        : <Filter className="h-4 w-4" />;

  const activeFilterColor = isOverdueFilter
    ? "bg-red-50 border-red-200 text-red-800"
    : isDueThisWeekFilter
      ? "bg-amber-50 border-amber-200 text-amber-800"
      : isReopenedFilter
        ? "bg-violet-50 border-violet-200 text-violet-800"
        : "bg-blue-50 border-blue-200 text-blue-800";

  const state = useIssuesListState({
    issues,
    initialStatus: statusParam ?? undefined,
    initialProcess: processParam ?? undefined,
    initialMonth: monthParam ?? undefined,
    initialOverdue: isOverdueFilter,
    initialReopened: isReopenedFilter,
    initialDateRange,
  });

  const handleExport = useCallback(() => {
    const headers = ["ID", "Issue Title", "Process", "Task", "Owner", "Raised By", "Severity", "Status", "Issue Date", "Due Date", "Reopen Count"];
    const rows = state.filteredIssues.map((i) => [
      String(i.id),
      i.issueTitle,
      getProcessName(i.processId),
      getTaskName(i.taskId),
      getUserName(i.assignedTo),
      getUserName(i.issueRaisedBy),
      i.severity,
      i.status,
      i.issueDate ? format(new Date(i.issueDate), "dd MMM yyyy") : "",
      i.dueDate ? format(new Date(i.dueDate), "dd MMM yyyy") : "",
      String(i.reopenCount),
    ]);
    exportToCsv(`issues-export-${format(new Date(), "yyyy-MM-dd")}.csv`, headers, rows);
  }, [state.filteredIssues, getProcessName, getTaskName, getUserName]);

  return (
    <div className="space-y-6">
      {/* Active filter banner from dashboard drill-down */}
      {hasUrlFilter && (
        <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${activeFilterColor}`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            {activeFilterIcon}
            <span>Filtered: {activeFilterLabel}</span>
            <span className="text-xs font-normal opacity-70">
              ({state.totalFiltered} {state.totalFiltered === 1 ? "issue" : "issues"})
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs hover:bg-white/50"
            onClick={() => navigate("/issues")}
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      )}

      {/* KPI Summary Strip */}
      <IssuesKpiStrip
        total={state.kpiCounts.total}
        open={state.kpiCounts.open}
        critical={state.kpiCounts.critical}
        overdue={state.kpiCounts.overdue}
        resolved={state.kpiCounts.resolved}
        onTotalClick={() => { state.clearFilters(); navigate("/issues"); }}
        onOpenClick={() => navigate("/open-issues")}
        onCriticalClick={() => { state.clearFilters(); state.setSeverityFilter("Critical"); navigate("/issues"); }}
        onOverdueClick={() => { state.clearFilters(); navigate("/issues?overdue=true"); }}
        onResolvedClick={() => navigate("/resolved")}
      />

      {/* Toolbar: Search + Filters + Sort + View Toggle */}
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
        onBulkUpload={() => setBulkUploadOpen(true)}
        onExport={handleExport}
      />

      {/* Content: Table or Card Grid */}
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
        />
      ) : (
        <IssuesCardGrid issues={state.paginatedIssues} />
      )}

      {/* Pagination */}
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

      <BulkUploadDialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen} />
    </div>
  );
}
