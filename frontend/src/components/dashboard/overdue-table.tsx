
import { Link } from "react-router-dom";
import { AlertTriangle, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMasterData } from "@/hooks/use-master-data";
import { isIssueOverdue } from "@/lib/utils";
import type { Issue } from "@/lib/types";

interface OverdueTableProps {
  issues: Issue[];
}

export function OverdueTable({ issues }: OverdueTableProps) {
  const { getProcessName, getUserName } = useMasterData();
  const now = new Date();

  const overdueIssues = issues
    .filter(isIssueOverdue)
    .map((i) => {
      const diffMs = now.getTime() - new Date(i.dueDate!).getTime();
      const daysOverdue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return { ...i, daysOverdue, owner: getUserName(i.assignedTo) };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <CardTitle className="text-sm font-semibold text-foreground">
            Overdue Issues
          </CardTitle>
          {overdueIssues.length > 0 && (
            <span className="rounded-full bg-red-100 dark:bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-700 dark:text-red-400">
              {overdueIssues.length}
            </span>
          )}
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Issues past their due date
        </CardDescription>
      </CardHeader>
      <CardContent>
        {overdueIssues.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No overdue issues. All on track.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="pb-3 pr-4 text-left">Issue</th>
                  <th className="pb-3 pr-4 text-left hidden sm:table-cell">Process</th>
                  <th className="pb-3 pr-4 text-left hidden md:table-cell">Owner</th>
                  <th className="pb-3 pr-4 text-left">Overdue</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {overdueIssues.map((issue) => (
                  <tr key={issue.id} className="group bg-red-50/30 dark:bg-red-500/5 transition-colors hover:bg-red-50/60 dark:hover:bg-red-500/10">
                    <td className="py-3 pr-4">
                      <span className="font-medium text-foreground">
                        {issue.issueTitle}
                      </span>
                      <p className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                        {getProcessName(issue.processId)} · {issue.owner}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground hidden sm:table-cell">
                      {getProcessName(issue.processId)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground hidden md:table-cell">
                      {issue.owner}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-500/20 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:text-red-400">
                        {issue.daysOverdue}d
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            to={`/issues/detail?id=${issue.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="font-medium">
                          View
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
