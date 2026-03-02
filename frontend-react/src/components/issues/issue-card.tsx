
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { StatusBadge } from "./status-badge";
import { SeverityBadge } from "./severity-badge";
import { useMasterData } from "@/hooks/use-master-data";
import { isIssueOverdue, parseUtcDate } from "@/lib/utils";
import { OverdueBadge, ReopenedBadge } from "@/components/shared/issue-badges";
import type { Issue } from "@/lib/types";

interface IssueCardProps {
  issue: Issue;
  /** Optional action buttons rendered in a footer row */
  renderActions?: (issue: Issue) => React.ReactNode;
  /** Show resolution details below the card (for resolved issues page) */
  showResolution?: boolean;
}

export function IssueCard({ issue, renderActions, showResolution }: IssueCardProps) {
  const { getProcessName, getUserName } = useMasterData();
  const isOverdue = isIssueOverdue(issue);

  const content = (
    <>
      {/* ── Desktop: 6-column grid (hidden on mobile) ── */}
      <div
        className="hidden md:grid items-center"
        style={{
          gridTemplateColumns: "3fr 1.2fr 1.2fr 1fr 120px 140px",
          columnGap: "1px",
        }}
      >
        {/* Col 1: Title + Description */}
        <div className="min-w-0 overflow-hidden border-r border-border/40 pr-4">
          <p className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-5">
            {issue.issueTitle}
          </p>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground leading-4">
            {issue.issueDescription}
          </p>
        </div>

        {/* Col 2: Process */}
        <div className="min-w-0 overflow-hidden border-r border-border/40 px-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 leading-4">
            Process
          </p>
          <p className="mt-0.5 truncate text-xs text-foreground/80 leading-4">
            {getProcessName(issue.processId)}
          </p>
        </div>

        {/* Col 3: Owner */}
        <div className="min-w-0 overflow-hidden border-r border-border/40 px-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 leading-4">
            Owner
          </p>
          <p className="mt-0.5 truncate text-xs text-foreground/80 leading-4">
            {getUserName(issue.assignedTo)}
          </p>
        </div>

        {/* Col 4: Due Date + Overdue/Reopened */}
        <div className="min-w-0 overflow-hidden border-r border-border/40 px-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 leading-4">
            Due Date
          </p>
          <p className="mt-0.5 text-xs text-foreground/80 leading-4">
            {issue.dueDate ? format(new Date(issue.dueDate), "dd MMM yyyy") : "-"}
          </p>
          {(isOverdue || issue.reopenCount > 0) && (
            <div className="mt-1 flex items-center gap-1">
              {isOverdue && <OverdueBadge />}
              {issue.reopenCount > 0 && <ReopenedBadge />}
            </div>
          )}
        </div>

        {/* Col 5: Severity — right-aligned, fixed 120px */}
        <div className="flex items-center justify-end px-3">
          <SeverityBadge severity={issue.severity} />
        </div>

        {/* Col 6: Status — right-aligned, fixed 140px */}
        <div className="flex items-center justify-end pl-3">
          <StatusBadge status={issue.status} />
        </div>
      </div>

      {/* ── Mobile: stacked card layout (hidden on desktop) ── */}
      <div className="md:hidden space-y-3">
        {/* Title */}
        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-5">
          {issue.issueTitle}
        </p>
        {issue.issueDescription && (
          <p className="line-clamp-2 text-xs text-muted-foreground leading-4">
            {issue.issueDescription}
          </p>
        )}

        {/* Badges row */}
        <div className="flex items-center gap-2 flex-wrap">
          <SeverityBadge severity={issue.severity} />
          <StatusBadge status={issue.status} />
          {isOverdue && <OverdueBadge />}
          {issue.reopenCount > 0 && <ReopenedBadge />}
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div>
            <span className="text-muted-foreground/60 font-medium uppercase tracking-wider text-[10px]">Process</span>
            <p className="text-foreground/80 mt-0.5">{getProcessName(issue.processId)}</p>
          </div>
          <div>
            <span className="text-muted-foreground/60 font-medium uppercase tracking-wider text-[10px]">Owner</span>
            <p className="text-foreground/80 mt-0.5">{getUserName(issue.assignedTo)}</p>
          </div>
          <div>
            <span className="text-muted-foreground/60 font-medium uppercase tracking-wider text-[10px]">Due Date</span>
            <p className="text-foreground/80 mt-0.5">
              {issue.dueDate ? format(new Date(issue.dueDate), "dd MMM yyyy") : "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons footer */}
      {renderActions && (
        <div className="flex items-center gap-2 border-t border-border/40 pt-3 mt-3">
          {renderActions(issue)}
        </div>
      )}

      {/* Resolution details */}
      {showResolution && issue.resolution && (
        <div className="mt-3 rounded-md border border-green-200 bg-green-50/50 px-3 py-2.5 space-y-1.5">
          <p className="text-xs text-green-900">{issue.resolution.resolutionNotes}</p>
          {issue.resolution.rootCause && (
            <p className="text-xs text-green-700"><span className="font-medium">Root Cause:</span> {issue.resolution.rootCause}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-green-600">
            <span>Resolved by {getUserName(issue.resolution.resolvedBy)}</span>
            <span>{format(parseUtcDate(issue.resolution.resolvedDate), "dd MMM yyyy")}</span>
            {issue.resolution.testedBy.length > 0 && (
              <span>Tested by {issue.resolution.testedBy.map(getUserName).join(", ")}</span>
            )}
          </div>
        </div>
      )}
    </>
  );

  // When actions are present, use a div wrapper (actions have their own links/buttons)
  if (renderActions) {
    return (
      <div className="group border-b border-border bg-card px-4 py-3 sm:px-5 sm:py-3.5 transition-colors hover:bg-accent/40 first:rounded-t-lg last:rounded-b-lg">
        {content}
      </div>
    );
  }

  // Default: entire card is a clickable link
  return (
    <Link
      to={`/issues/detail?id=${issue.id}`}
      className="group block border-b border-border bg-card px-4 py-3 sm:px-5 sm:py-3.5 transition-colors hover:bg-accent/40 first:rounded-t-lg last:rounded-b-lg"
    >
      {content}
    </Link>
  );
}
