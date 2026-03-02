
import { format } from "date-fns";
import { History } from "lucide-react";
import { parseUtcDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StatusBadge } from "./status-badge";
import { useMasterData } from "@/hooks/use-master-data";
import type { Issue } from "@/lib/types";

interface VersionHistoryDialogProps {
  issue: Issue;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VersionHistoryDialog({ issue, open, onOpenChange }: VersionHistoryDialogProps) {
  const { getUserName, getProcessName } = useMasterData();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
              <History className="h-4.5 w-4.5 text-violet-600" />
            </div>
            <div>
              <DialogTitle>Version History</DialogTitle>
              <DialogDescription className="mt-0.5">
                {issue.issueTitle} &middot; {issue.versions.length} entr{issue.versions.length !== 1 ? "ies" : "y"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {[...issue.versions].map((version, idx) => ({
            version,
            seqNum: idx + 1,
          })).reverse().map(({ version, seqNum }, idx) => {
            const isCurrent = idx === 0;
            return (
              <div
                key={seqNum}
                className={`rounded-lg border p-4 space-y-3 ${
                  isCurrent ? "border-primary/30 bg-primary/5" : "bg-muted/20"
                }`}
              >
                {/* Version header */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">V{seqNum}</span>
                    {isCurrent && (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        Current
                      </span>
                    )}
                    {version.reopenReason && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        Reopened
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={version.status} />
                    <span className="text-xs text-muted-foreground">
                      {format(parseUtcDate(version.createdDate), "dd MMM yyyy")}
                    </span>
                  </div>
                </div>

                {/* Reopen reason */}
                {version.reopenReason && (
                  <div className="rounded-md border border-amber-200 bg-amber-50/50 px-3 py-2">
                    <p className="text-xs font-medium text-amber-700 mb-0.5">Reopen Reason</p>
                    <p className="text-sm text-amber-900">{version.reopenReason}</p>
                  </div>
                )}

                {/* Version details */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-sm">
                  {version.modifiedBy && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Modified By</p>
                      <p className="text-foreground">{getUserName(version.modifiedBy)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Assigned To</p>
                    <p className="text-foreground">{getUserName(version.assignedTo)}</p>
                  </div>
                  {version.assigningDate && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Assigning Date</p>
                      <p className="text-foreground">{format(parseUtcDate(version.assigningDate), "dd MMM yyyy")}</p>
                    </div>
                  )}
                  {version.dueDate && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Due Date</p>
                      <p className="text-foreground">{format(parseUtcDate(version.dueDate), "dd MMM yyyy")}</p>
                    </div>
                  )}
                </div>

                {/* Resolution details */}
                {version.resolution && (
                  <div className="rounded-md border border-green-200 bg-green-50/50 px-3 py-2 space-y-2">
                    <p className="text-xs font-semibold text-green-700">Resolution</p>
                    <p className="text-sm text-green-900">{version.resolution.resolutionNotes}</p>
                    {version.resolution.rootCause && (
                      <div>
                        <p className="text-xs font-medium text-green-700">Root Cause</p>
                        <p className="text-sm text-green-900">{version.resolution.rootCause}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-green-700">
                      <span>Resolved by {getUserName(version.resolution.resolvedBy)}</span>
                      <span>{format(parseUtcDate(version.resolution.resolvedDate), "dd MMM yyyy")}</span>
                      {version.resolution.testedBy.length > 0 && (
                        <span>Tested by {version.resolution.testedBy.map(getUserName).join(", ")}</span>
                      )}
                    </div>

                    {/* Dependent process test results */}
                    {version.dependentProcessesTested.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-1">Dependent Processes</p>
                        <div className="flex flex-wrap gap-2">
                          {version.dependentProcessesTested.map((dep) => (
                            <span
                              key={dep.processId}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                dep.tested
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {dep.tested ? "✓" : "○"} {getProcessName(dep.processId)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
