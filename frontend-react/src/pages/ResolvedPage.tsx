
import { useMemo, Suspense } from "react";
import { CheckCircle2, Lock, RotateCcw, ShieldCheck } from "lucide-react";
import { useIssues } from "@/hooks/use-issues";
import { useIssuesListState } from "@/hooks/use-issues-list-state";
import { IssuesToolbar } from "@/components/issues/issues-toolbar";
import { IssuesTable } from "@/components/issues/issues-table";
import { IssuesCardGrid } from "@/components/issues/issues-card-grid";
import { IssuesPagination } from "@/components/issues/issues-pagination";
import { IssuesEmptyState } from "@/components/issues/issues-empty-state";
import { IssuesTableSkeleton } from "@/components/issues/issues-table-skeleton";
import { StatCard } from "@/components/dashboard/stat-card";

export default function ResolvedIssuesPage() {
  return (
    <Suspense fallback={<IssuesTableSkeleton />}>
      <ResolvedIssuesContent />
    </Suspense>
  );
}

function ResolvedIssuesContent() {
  const { issues } = useIssues();

  const resolvedIssues = useMemo(
    () => issues.filter((i) => i.status === "Resolved" || i.status === "Closed"),
    [issues],
  );

  const state = useIssuesListState({ issues: resolvedIssues });

  const kpis = useMemo(() => {
    const resolved = resolvedIssues.filter((i) => i.status === "Resolved").length;
    const closed = resolvedIssues.filter((i) => i.status === "Closed").length;
    const wasReopened = resolvedIssues.filter((i) => i.reopenCount > 0).length;
    return { total: resolvedIssues.length, resolved, closed, wasReopened };
  }, [resolvedIssues]);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Resolved Issues</h1>
          <p className="text-sm text-muted-foreground">
            {resolvedIssues.length} {resolvedIssues.length === 1 ? "issue" : "issues"} resolved or closed
            {kpis.wasReopened > 0 && (
              <span className="text-amber-600 font-medium"> &middot; {kpis.wasReopened} previously reopened</span>
            )}
          </p>
        </div>
      </div>

      {/* ── KPI Cards — resolved-specific ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total"
          value={kpis.total}
          icon={<CheckCircle2 className="h-4 w-4 text-slate-500" />}
          accentColor="bg-slate-500"
          numberColor="text-slate-800"
          className="bg-slate-50/40"
        />
        <StatCard
          title="Resolved"
          value={kpis.resolved}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          accentColor="bg-emerald-600"
          numberColor="text-emerald-900"
          className="bg-emerald-50/40"
        />
        <StatCard
          title="Closed"
          value={kpis.closed}
          icon={<Lock className="h-4 w-4 text-blue-600" />}
          accentColor="bg-blue-600"
          numberColor="text-blue-900"
          className="bg-blue-50/40"
        />
        <StatCard
          title="Was Reopened"
          value={kpis.wasReopened}
          icon={<RotateCcw className="h-4 w-4 text-amber-500" />}
          accentColor="bg-amber-500"
          numberColor="text-amber-800"
          className="bg-amber-50/40"
        />
      </div>

      {/* ── Toolbar: Search + Filters + Sort + View Toggle ── */}
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
        statusOptions={["Resolved", "Closed"]}
      />

      {/* ── Content: Table or Card Grid ── */}
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
        <IssuesCardGrid issues={state.paginatedIssues} showResolution />
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
