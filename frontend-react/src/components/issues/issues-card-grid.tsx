
import { IssueCard } from "./issue-card";
import type { Issue } from "@/lib/types";

interface IssuesCardGridProps {
  issues: Issue[];
  /** Optional per-card action buttons */
  renderActions?: (issue: Issue) => React.ReactNode;
  /** Show resolution details on each card */
  showResolution?: boolean;
}

export function IssuesCardGrid({ issues, renderActions, showResolution }: IssuesCardGridProps) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      {issues.map((issue) => (
        <IssueCard key={issue.id} issue={issue} renderActions={renderActions} showResolution={showResolution} />
      ))}
    </div>
  );
}
