
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Search, X, Plus, Upload, Download, LayoutGrid, TableProperties, CalendarIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useMasterData } from "@/hooks/use-master-data";
import { cn } from "@/lib/utils";
import type { SortField } from "@/hooks/use-issues-list-state";

export interface DateRange {
  from?: Date;
  to?: Date;
}

interface IssuesToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  severityFilter: string;
  onSeverityFilterChange: (v: string) => void;
  processFilter: string;
  onProcessFilterChange: (v: string) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (v: DateRange) => void;
  sortBy: SortField;
  onSortChange: (v: SortField) => void;
  viewMode: "table" | "card";
  onViewModeChange: (v: "table" | "card") => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  totalFiltered: number;
  /** Override which statuses appear in the filter dropdown */
  statusOptions?: string[];
  /** Hide the status filter entirely (e.g. on pre-filtered pages) */
  hideStatusFilter?: boolean;
  /** Hide the "New Issue" button */
  hideNewIssue?: boolean;
  /** Callback to open the bulk upload dialog */
  onBulkUpload?: () => void;
  /** Callback to export issues as CSV */
  onExport?: () => void;
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "dueDate", label: "Due Date" },
  { value: "severity", label: "Severity" },
  { value: "status", label: "Status" },
  { value: "title", label: "Title" },
  { value: "process", label: "Process" },
  { value: "owner", label: "Owner" },
];

export function IssuesToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  severityFilter,
  onSeverityFilterChange,
  processFilter,
  onProcessFilterChange,
  dateRange,
  onDateRangeChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  hasActiveFilters,
  onClearFilters,
  totalFiltered,
  statusOptions,
  hideStatusFilter,
  hideNewIssue,
  onBulkUpload,
  onExport,
}: IssuesToolbarProps) {
  const { permissions } = useAuth();
  const { statuses: masterStatuses, severities: masterSeverities, processes: masterProcesses } = useMasterData();
  const statuses = statusOptions ?? masterStatuses.map(s => s.name);
  const hasDateRange = dateRange?.from || dateRange?.to;

  return (
    <div className="space-y-3">
      {/* Row 1: Search + Count + New Issue */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search issues..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {totalFiltered} {totalFiltered === 1 ? "issue" : "issues"}
        </span>
        {onExport && (
          <Button variant="outline" className="gap-1.5 shrink-0" onClick={onExport}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        )}
        {onBulkUpload && permissions.canBulkUpload && (
          <Button variant="outline" className="gap-1.5 shrink-0" onClick={onBulkUpload}>
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Bulk Upload</span>
          </Button>
        )}
        {!hideNewIssue && permissions.canCreateIssue && (
          <Button asChild className="gap-1.5 shrink-0">
            <Link to="/issues/new">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Issue</span>
            </Link>
          </Button>
        )}
      </div>

      {/* Row 2: Filters + Sort + View Toggle */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        {!hideStatusFilter && (
          <Select
            value={statusFilter}
            onValueChange={(v) => onStatusFilterChange(v)}
          >
            <SelectTrigger className="h-9 w-full sm:w-[140px] text-sm">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={severityFilter}
          onValueChange={(v) => onSeverityFilterChange(v)}
        >
          <SelectTrigger className="h-9 w-full sm:w-[140px] text-sm">
            <SelectValue placeholder="All Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            {masterSeverities.map((s) => (
              <SelectItem key={s.name} value={s.name}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={processFilter} onValueChange={onProcessFilterChange}>
          <SelectTrigger className="h-9 w-full sm:w-[160px] text-sm">
            <SelectValue placeholder="All Processes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Processes</SelectItem>
            {masterProcesses.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {onDateRangeChange && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-9 w-full sm:w-auto justify-start text-left text-sm font-normal gap-2",
                  !hasDateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                {hasDateRange ? (
                  <span className="truncate">
                    {dateRange?.from ? format(dateRange.from, "dd MMM") : "Start"}
                    {" - "}
                    {dateRange?.to ? format(dateRange.to, "dd MMM") : "End"}
                  </span>
                ) : (
                  <span>Due Date Range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange?.from ? { from: dateRange.from, to: dateRange.to } : undefined}
                onSelect={(range) => {
                  onDateRangeChange({
                    from: range?.from,
                    to: range?.to,
                  });
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}

        <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortField)}>
          <SelectTrigger className="h-9 w-full sm:w-[140px] text-sm">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-9 gap-1 text-sm text-muted-foreground hover:text-foreground col-span-2 sm:col-span-1"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}

        <div className="hidden sm:block sm:flex-1" />

        {/* View toggle */}
        <div className="flex items-center justify-end col-span-2 sm:col-span-1 rounded-md border bg-muted/30 p-0.5 w-fit ml-auto">
          <button
            onClick={() => onViewModeChange("table")}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-sm transition-colors",
              viewMode === "table"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TableProperties className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewModeChange("card")}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-sm transition-colors",
              viewMode === "card"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
