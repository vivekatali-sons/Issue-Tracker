
import { useNavigate } from "react-router-dom";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { cn, isIssueOverdue } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { StatusBadge } from "./status-badge";
import { SeverityBadge } from "./severity-badge";
import { OverdueBadge, ReopenedBadge } from "@/components/shared/issue-badges";
import { useMasterData } from "@/hooks/use-master-data";
import type { Issue } from "@/lib/types";
import type { SortField } from "@/hooks/use-issues-list-state";

interface IssuesTableProps {
  issues: Issue[];
  sortBy: SortField;
  sortDir: "asc" | "desc";
  onToggleSort: (field: SortField) => void;
  /** Optional per-row action buttons (e.g. "View Details", "Resolve Now") */
  renderActions?: (issue: Issue) => React.ReactNode;
}

function SortableHeader({
  label,
  field,
  currentSort,
  currentDir,
  onToggle,
  className,
}: {
  label: string;
  field: SortField;
  currentSort: SortField;
  currentDir: "asc" | "desc";
  onToggle: (field: SortField) => void;
  className?: string;
}) {
  const isActive = currentSort === field;
  return (
    <TableHead className={className}>
      <button
        onClick={() => onToggle(field)}
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest transition-colors",
          isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {label}
        {isActive ? (
          currentDir === "asc" ? (
            <ArrowUp className="h-3 w-3 text-primary" />
          ) : (
            <ArrowDown className="h-3 w-3 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 text-muted-foreground/30" />
        )}
      </button>
    </TableHead>
  );
}

export function IssuesTable({ issues, sortBy, sortDir, onToggleSort, renderActions }: IssuesTableProps) {
  const navigate = useNavigate();
  const { getProcessName, getUserName } = useMasterData();

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      <Table className="w-full table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent bg-muted/30">
            <SortableHeader
              label="Issue"
              field="title"
              currentSort={sortBy}
              currentDir={sortDir}
              onToggle={onToggleSort}
              className="w-auto"
            />
            <SortableHeader
              label="Process"
              field="process"
              currentSort={sortBy}
              currentDir={sortDir}
              onToggle={onToggleSort}
              className="hidden md:table-cell w-[13%]"
            />
            <SortableHeader
              label="Owner"
              field="owner"
              currentSort={sortBy}
              currentDir={sortDir}
              onToggle={onToggleSort}
              className="hidden lg:table-cell w-[13%]"
            />
            <SortableHeader
              label="Severity"
              field="severity"
              currentSort={sortBy}
              currentDir={sortDir}
              onToggle={onToggleSort}
              className="w-[10%]"
            />
            <SortableHeader
              label="Status"
              field="status"
              currentSort={sortBy}
              currentDir={sortDir}
              onToggle={onToggleSort}
              className="w-[11%]"
            />
            <SortableHeader
              label="Due Date"
              field="dueDate"
              currentSort={sortBy}
              currentDir={sortDir}
              onToggle={onToggleSort}
              className="hidden sm:table-cell w-[12%]"
            />
            {renderActions && (
              <TableHead className="w-[80px] text-right">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Actions
                </span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.map((issue) => {
            const isOverdue = isIssueOverdue(issue);

            return (
              <TableRow
                key={issue.id}
                className={cn(
                  "group cursor-pointer transition-colors",
                  isOverdue
                    ? "bg-red-50/30 hover:bg-red-50/60 shadow-[inset_3px_0_0_0_theme(colors.red.500)]"
                    : "hover:bg-accent/50"
                )}
                onClick={() => navigate(`/issues/detail?id=${issue.id}`)}
              >
                <TableCell className="py-3.5 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors leading-5">
                      {issue.issueTitle}
                    </p>
                    {isOverdue && <OverdueBadge />}
                    {issue.reopenCount > 0 && <ReopenedBadge />}
                  </div>
                  {/* Mobile: show process + owner inline */}
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground md:hidden">
                    <span>{getProcessName(issue.processId)}</span>
                    <span className="lg:hidden">{issue.assignedTo ? getUserName(issue.assignedTo) : "NA"}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-[13px] text-muted-foreground">
                  {getProcessName(issue.processId)}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-[13px] text-muted-foreground">
                  {issue.assignedTo ? getUserName(issue.assignedTo) : "NA"}
                </TableCell>
                <TableCell>
                  <SeverityBadge severity={issue.severity} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={issue.status} />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className={cn("text-[13px]", isOverdue ? "text-red-600 font-medium" : "text-muted-foreground")}>
                    {issue.dueDate
                      ? format(new Date(issue.dueDate), "dd MMM yyyy")
                      : "-"}
                  </span>
                </TableCell>
                {renderActions && (
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {renderActions(issue)}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
