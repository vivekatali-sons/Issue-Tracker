
import { useMemo, useState, Suspense } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AlertTriangle, CalendarClock, RotateCcw, Filter, X } from "lucide-react";
import { BulkUploadDialog } from "@/components/issues/bulk-upload-dialog";
import { useIssues } from "@/hooks/use-issues";
import { useIssuesListState } from "@/hooks/use-issues-list-state";
import { IssuesKpiStrip } from "@/components/issues/issues-kpi-strip";
import { IssuesToolbar } from "@/components/issues/issues-toolbar";
import { IssuesTable } from "@/components/issues/issues-table";
import { IssuesCardGrid } from "@/components/issues/issues-card-grid";
import { IssuesPagination } from "@/components/issues/issues-pagination";
import { IssuesEmptyState } from "@/components/issues/issues-empty-state";
import { IssuesTableSkeleton } from "@/components/issues/issues-table-skeleton";
import { Button } from "@/components/ui/button";
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

  const isReopenedFilter = searchParams.get("reopened") === "true";
  const isOverdueFilter = searchParams.get("overdue") === "true";
  const isDueThisWeekFilter = searchParams.get("dueThisWeek") === "true";
  const statusParam = searchParams.get("status") as Status | null;

  const hasUrlFilter = isReopenedFilter || isOverdueFilter || isDueThisWeekFilter || !!statusParam;

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
        : statusParam
          ? `Status: ${statusParam}`
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
    initialOverdue: isOverdueFilter,
    initialReopened: isReopenedFilter,
    initialDateRange,
  });

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
