
import { useState, useMemo, useEffect } from "react";
import { useMasterData } from "@/hooks/use-master-data";
import { isIssueOverdue } from "@/lib/utils";
import type { Issue } from "@/lib/types";
import type { DateRange } from "@/components/issues/issues-toolbar";

export type SortField = "title" | "process" | "owner" | "severity" | "status" | "dueDate";

interface UseIssuesListStateOptions {
  issues: Issue[];
  initialStatus?: string;
  initialOverdue?: boolean;
  initialReopened?: boolean;
  initialDateRange?: DateRange;
}

export function useIssuesListState({
  issues,
  initialStatus,
  initialOverdue = false,
  initialReopened = false,
  initialDateRange,
}: UseIssuesListStateOptions) {
  const { getProcessName, getUserName, statusOrder, severityOrder } = useMasterData();

  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus ?? "all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [processFilter, setProcessFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange ?? {});

  // Sort state
  const [sortBy, setSortBy] = useState<SortField>("dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // View mode
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const hasDateRange = !!(dateRange.from || dateRange.to);

  const hasActiveFilters =
    search !== "" ||
    statusFilter !== "all" ||
    severityFilter !== "all" ||
    processFilter !== "all" ||
    hasDateRange;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSeverityFilter("all");
    setProcessFilter("all");
    setDateRange({});
  };

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  // KPI counts (always from full issues array)
  const kpiCounts = useMemo(() => {
    return {
      total: issues.length,
      open: issues.filter((i) => !["Resolved", "Closed"].includes(i.status)).length,
      critical: issues.filter(
        (i) => i.severity === "Critical" && !["Resolved", "Closed"].includes(i.status)
      ).length,
      overdue: issues.filter(isIssueOverdue).length,
    };
  }, [issues]);

  // Filtered issues
  const filteredIssues = useMemo(() => {
    let result = issues;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.issueTitle.toLowerCase().includes(q) ||
          i.issueDescription.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") result = result.filter((i) => i.status === statusFilter);
    if (severityFilter !== "all") result = result.filter((i) => i.severity === severityFilter);
    if (processFilter !== "all") result = result.filter((i) => i.processId === processFilter);

    // Date range filter (from/to calendar)
    if (dateRange.from || dateRange.to) {
      result = result.filter((i) => {
        if (!i.dueDate) return false;
        const due = new Date(i.dueDate);
        // Normalize to start of day for comparison
        const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

        if (dateRange.from && dateRange.to) {
          const from = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate());
          const to = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate());
          return dueDay >= from && dueDay <= to;
        }
        if (dateRange.from) {
          const from = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate());
          return dueDay >= from;
        }
        if (dateRange.to) {
          const to = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate());
          return dueDay <= to;
        }
        return true;
      });
    }

    // URL-param drill-downs
    if (initialOverdue) {
      result = result.filter(isIssueOverdue);
    }
    if (initialReopened) {
      result = result.filter((i) => i.reopenCount > 0);
    }

    return result;
  }, [issues, search, statusFilter, severityFilter, processFilter, dateRange, initialOverdue, initialReopened]);

  // Sorted issues
  const sortedIssues = useMemo(() => {
    const sorted = [...filteredIssues];
    const dir = sortDir === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "title":
          cmp = a.issueTitle.localeCompare(b.issueTitle);
          break;
        case "process":
          cmp = getProcessName(a.processId).localeCompare(getProcessName(b.processId));
          break;
        case "owner": {
          const ownerA = getUserName(a.assignedTo);
          const ownerB = getUserName(b.assignedTo);
          cmp = ownerA.localeCompare(ownerB);
          break;
        }
        case "severity":
          cmp = (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99);
          break;
        case "status":
          cmp = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
          break;
        case "dueDate": {
          const dA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          const dB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          cmp = dA - dB;
          break;
        }
      }
      // Tiebreaker: newest first
      if (cmp === 0) {
        cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return dir * cmp;
    });

    return sorted;
  }, [filteredIssues, sortBy, sortDir, getProcessName, getUserName, statusOrder, severityOrder]);

  // Pagination
  const totalFiltered = sortedIssues.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  const paginatedIssues = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedIssues.slice(start, start + pageSize);
  }, [sortedIssues, page, pageSize]);

  // Auto-reset page when filters or sort change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, severityFilter, processFilter, dateRange, sortBy, sortDir, pageSize]);

  return {
    // Filters
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    severityFilter,
    setSeverityFilter,
    processFilter,
    setProcessFilter,
    dateRange,
    setDateRange,
    hasActiveFilters,
    clearFilters,
    // Sort
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    toggleSort,
    // View
    viewMode,
    setViewMode,
    // Pagination
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalFiltered,
    // Data
    paginatedIssues,
    filteredIssues: sortedIssues,
    kpiCounts,
  };
}
