
import { Suspense, useState, useEffect, useCallback } from "react";
import type { Issue, IssueVersion as IssueVersionType } from "@/lib/types";
import { Link } from "react-router-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import {
  Calendar,
  Clock,
  Edit,
  FileSearch,
  FileText,
  History,
  Loader2,
  RotateCcw,
  CheckCircle2,
  User,
  Trash2,
} from "lucide-react";
import { cn, isIssueOverdue, parseUtcDate } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIssues } from "@/hooks/use-issues";
import { useConfirm } from "@/hooks/use-confirm-dialog";
import { StatusBadge } from "@/components/issues/status-badge";
import { SeverityBadge } from "@/components/issues/severity-badge";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { MetaField } from "@/components/shared/meta-field";
import { OverdueBadge, ReopenedBadge } from "@/components/shared/issue-badges";
import { ResolveIssueDialog } from "@/components/issues/resolve-issue-dialog";
import { ReopenIssueDialog } from "@/components/issues/reopen-issue-dialog";
import { EditIssueDialog } from "@/components/issues/edit-issue-dialog";
import { VersionHistoryDialog } from "@/components/issues/version-history-dialog";
import { VersionChangesDialog } from "@/components/issues/version-changes-dialog";
import { FileUploadZone } from "@/components/shared/file-upload-zone";
import { useMasterData } from "@/hooks/use-master-data";
import { useAuth } from "@/hooks/use-auth";


// ============================================================
// Timeline action styling
// ============================================================
const TIMELINE_ACTION_STYLES: Record<string, string> = {
  Created: "bg-blue-100 text-blue-700",
  Edited: "bg-purple-100 text-purple-700",
  Resolved: "bg-green-100 text-green-700",
  Reopened: "bg-amber-100 text-amber-700",
};

// ============================================================
// Page
// ============================================================
export default function IssueDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">Loading issue details...</p>
      </div>
    }>
      <IssueDetailContent />
    </Suspense>
  );
}

function IssueDetailContent() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const numericId = Number(id);
  const navigate = useNavigate();
  const { getIssueDetail, deleteIssue } = useIssues();
  const confirm = useConfirm();
  const { getProcessName, getTaskName, getUserName } = useMasterData();
  const { permissions } = useAuth();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  const [changesVersion, setChangesVersion] = useState<{ version: IssueVersionType; action: string; actor: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Re-fetch issue detail from API
  const refreshIssue = useCallback(() => {
    getIssueDetail(numericId)
      .then(setIssue)
      .catch(() => setIssue(null));
  }, [numericId, getIssueDetail]);

  // Initial fetch
  useEffect(() => {
    let cancelled = false;
    setDetailLoading(true);
    getIssueDetail(numericId)
      .then((detail) => { if (!cancelled) setIssue(detail); })
      .catch(() => { if (!cancelled) setIssue(null); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [numericId, getIssueDetail]);

  if (detailLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">Loading issue details...</p>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FileText className="h-12 w-12 text-muted-foreground/30" />
        <p className="mt-4 text-lg font-medium text-foreground">Issue not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The issue you are looking for does not exist or has been removed.
        </p>
        <Link to="/issues">
          <Button variant="outline" className="mt-6">Back to All Issues</Button>
        </Link>
      </div>
    );
  }

  const latestVersion = issue.versions[issue.versions.length - 1];
  const isOverdue = isIssueOverdue(issue);
  const isResolvedOrClosed = issue.status === "Resolved" || issue.status === "Closed";
  const isResolvable = !isResolvedOrClosed;
  const isReopenable = isResolvedOrClosed;

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Delete Issue",
      description:
        "Are you sure you want to delete this issue? This action cannot be undone and all version history will be permanently lost.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (confirmed) {
      setIsDeleting(true);
      try {
        await deleteIssue(issue.id);
        toast.success("Issue deleted successfully");
        navigate("/issues");
      } catch (err) {
        toast.error("Failed to delete issue");
        console.error(err);
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* ── Breadcrumb ── */}
      <Breadcrumb items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Issues", href: "/issues" },
        { label: "Issue Details" },
      ]} />

      {/* ── Main Card ── */}
      <div className="rounded-xl border bg-card shadow-md overflow-hidden">
        {/* Header */}
        <div className="border-b px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Issue Details</h1>
                <p className="text-sm text-muted-foreground">
                  <span className="font-mono font-medium">#{issue.id}</span>
                  {issue.currentVersion > 1 && (
                    <> &middot; Version {issue.currentVersion}</>
                  )}
                  {issue.reopenCount > 0 && (
                    <> &middot; Reopened {issue.reopenCount} time(s)</>
                  )}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {issue.currentVersion > 1 && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setHistoryOpen(true)}>
                  <History className="h-3.5 w-3.5" />
                  History
                </Button>
              )}
              {isReopenable && (
                <Button variant="outline" size="sm" className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50" onClick={() => setReopenOpen(true)}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reopen
                </Button>
              )}
              {isResolvable && permissions.canResolveIssue && (
                <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={() => setResolveOpen(true)}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Resolve
                </Button>
              )}
              {permissions.canEditIssue && !isResolvedOrClosed && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 sm:px-8 space-y-8">
          {/* Title + Badges */}
          <div>
            <h2 className="text-lg font-semibold text-foreground leading-tight mb-3">
              {issue.issueTitle}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={issue.status} />
              <SeverityBadge severity={issue.severity} />
              {issue.reopenCount > 0 && (
                <ReopenedBadge count={issue.reopenCount} withIcon />
              )}
              {isOverdue && (
                <OverdueBadge withIcon />
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
              {issue.issueDescription || "No description provided."}
            </p>
          </div>

          {/* Issue Details — 2x2 grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <MetaField label="Process" value={getProcessName(issue.processId)} />
            <MetaField label="Task" value={getTaskName(issue.taskId)} />
            <MetaField label="Raised By" value={getUserName(issue.issueRaisedBy)} />
            <MetaField label="Issue Date" value={format(parseUtcDate(issue.issueDate), "dd MMM yyyy")} />
          </div>

          {/* Dependent Processes */}
          {issue.dependentProcesses.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Dependent Processes</p>
              <div className="flex flex-wrap gap-2">
                {issue.dependentProcesses.map((pid) => (
                  <span
                    key={pid}
                    className="inline-flex items-center rounded-full border bg-muted/30 px-3 py-1 text-xs font-medium text-foreground/80"
                  >
                    {getProcessName(pid)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {issue.attachments.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Attachments</p>
              <FileUploadZone attachments={issue.attachments} onChange={() => {}} readonly />
            </div>
          )}

          {/* ── Issue Assignment — colored cards (matches docs HTML) ── */}
          {(latestVersion.assignedTo || latestVersion.assigningDate || latestVersion.dueDate) && (
            <>
              <Separator />
              <div>
                <h3 className="text-base font-semibold text-foreground mb-4">Issue Assignment</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {latestVersion.assignedTo && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-600 mb-1.5">
                        Issue Owner
                      </p>
                      <p className="text-sm font-semibold text-blue-900">
                        {getUserName(latestVersion.assignedTo)}
                      </p>
                    </div>
                  )}
                  {latestVersion.assigningDate && (
                    <div className="rounded-lg border border-green-200 bg-green-50/70 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-green-600 mb-1.5">
                        Assigning Date
                      </p>
                      <p className="text-sm font-semibold text-green-900">
                        {format(parseUtcDate(latestVersion.assigningDate), "MMM dd, yyyy")}
                      </p>
                    </div>
                  )}
                  {latestVersion.dueDate && (
                    <div className={cn(
                      "rounded-lg border p-4",
                      isOverdue
                        ? "border-red-300 bg-red-50/70"
                        : "border-orange-200 bg-orange-50/70"
                    )}>
                      <p className={cn(
                        "text-xs font-medium uppercase tracking-wide mb-1.5",
                        isOverdue ? "text-red-600" : "text-orange-600"
                      )}>
                        Due Date
                      </p>
                      <p className={cn(
                        "text-sm font-semibold",
                        isOverdue ? "text-red-900" : "text-orange-900"
                      )}>
                        {format(parseUtcDate(latestVersion.dueDate), "MMM dd, yyyy")}
                      </p>
                      {isOverdue && latestVersion.dueDate && (
                        <p className="mt-1 text-xs font-medium text-red-600">
                          Overdue by {formatDistanceToNow(parseUtcDate(latestVersion.dueDate))}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── Resolution — green card (matches docs HTML) ── */}
          {issue.resolution && issue.status !== "Reopened" && (
            <>
              <Separator />
              <div className="rounded-lg border border-green-200 bg-green-50/50 p-5 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <h3 className="text-base font-semibold text-green-900">Issue Resolution</h3>
                  </div>
                  <span className="text-xs text-green-700">
                    {format(parseUtcDate(issue.resolution.resolvedDate), "dd MMM yyyy")}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-green-800 mb-1.5">
                      Resolution Notes
                    </p>
                    <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                      {issue.resolution.resolutionNotes}
                    </p>
                  </div>

                  {issue.resolution.rootCause && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-green-800 mb-1.5">
                        Root Cause
                      </p>
                      <p className="text-sm text-foreground/80">{issue.resolution.rootCause}</p>
                    </div>
                  )}

                  {issue.resolution.preventiveMeasures && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-green-800 mb-1.5">
                        Preventive Measures
                      </p>
                      <p className="text-sm text-foreground/80">{issue.resolution.preventiveMeasures}</p>
                    </div>
                  )}

                  {/* Dependent process test results */}
                  {issue.resolution.dependentProcessesTestResults.length > 0 && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-green-800 mb-2">
                        Dependent Processes Testing
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {issue.resolution.dependentProcessesTestResults.map((result) => (
                          <div
                            key={result.processId}
                            className="flex items-center justify-between rounded-md border border-green-300 bg-white px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                              <span className="text-sm font-medium">{getProcessName(result.processId)}</span>
                            </div>
                            {result.testedBy.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {result.testedBy.map(getUserName).join(", ")}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator className="bg-green-200/60" />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-medium text-green-700 mb-0.5">Resolved By</p>
                      <p className="text-sm font-medium text-foreground">
                        {getUserName(issue.resolution.resolvedBy)}
                      </p>
                    </div>
                    {issue.resolution.testedBy.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-0.5">Tested By</p>
                        <p className="text-sm font-medium text-foreground">
                          {issue.resolution.testedBy.map(getUserName).join(", ")}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-green-700 mb-0.5">Verification Date</p>
                      <p className="text-sm font-medium text-foreground">
                        {format(parseUtcDate(issue.resolution.verificationDate), "dd MMM yyyy")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Timeline ── */}
          {issue.versions.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Timeline
                </h3>

                {/* Desktop: table layout */}
                <div className="hidden sm:block rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="w-[50px] text-[11px] font-semibold uppercase tracking-widest">Ver</TableHead>
                        <TableHead className="w-[100px] text-[11px] font-semibold uppercase tracking-widest">Action</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-widest">By</TableHead>
                        <TableHead className="w-[150px] text-[11px] font-semibold uppercase tracking-widest">Date & Time</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-widest">Details</TableHead>
                        <TableHead className="w-[50px] text-[11px] font-semibold uppercase tracking-widest text-center">View</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Build timeline entries with incremental version, then sort latest-first */}
                      {issue.versions.map((version, idx) => {
                        let action: string;
                        let actor: string;
                        if (idx === 0) {
                          action = "Created";
                          actor = getUserName(version.modifiedBy || issue.issueRaisedBy);
                        } else if (version.reopenReason) {
                          action = "Reopened";
                          actor = getUserName(version.modifiedBy || version.assignedTo);
                        } else if (version.resolution || version.status === "Resolved") {
                          action = "Resolved";
                          actor = getUserName(version.modifiedBy || (version.resolution ? version.resolution.resolvedBy : version.assignedTo));
                        } else {
                          action = "Edited";
                          actor = getUserName(version.modifiedBy || version.assignedTo);
                        }
                        return { version, idx, action, actor, seqNum: idx + 1 };
                      }).reverse().map(({ version, idx, action, actor, seqNum }) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium text-foreground">
                              V{seqNum}
                            </TableCell>
                            <TableCell>
                              <span className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                TIMELINE_ACTION_STYLES[action] ?? "bg-gray-100 text-gray-700"
                              )}>
                                {action}
                              </span>
                            </TableCell>
                            <TableCell className="text-foreground/80 text-sm">
                              {actor}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              <div>{format(parseUtcDate(version.createdDate), "dd MMM yyyy")}</div>
                              <div className="text-muted-foreground/70">{format(parseUtcDate(version.createdDate), "hh:mm a")}</div>
                            </TableCell>
                            <TableCell className="max-w-[240px]">
                              {action === "Created" && (
                                <span className="text-xs text-muted-foreground">
                                  Assigned to {getUserName(version.assignedTo)}
                                  {version.dueDate && <> · Due {format(version.dueDate, "dd MMM yyyy")}</>}
                                </span>
                              )}
                              {action === "Reopened" && (
                                <span className="text-xs text-amber-700">
                                  {version.reopenReason}
                                </span>
                              )}
                              {action === "Resolved" && (
                                <span className="text-xs text-green-700 line-clamp-1">
                                  {version.resolution?.resolutionNotes}
                                </span>
                              )}
                              {action === "Edited" && (
                                <span className="text-xs text-muted-foreground">
                                  Status: {version.status}
                                  {version.dueDate && <> · Due {format(version.dueDate, "dd MMM yyyy")}</>}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {version.changesSummary && version.changesSummary.length > 0 ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => {
                                          setChangesVersion({ version, action, actor });
                                          setChangesOpen(true);
                                        }}
                                      >
                                        <FileSearch className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View changes</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile: stacked card layout */}
                <div className="sm:hidden space-y-3">
                  {issue.versions.map((version, idx) => {
                    let action: string;
                    let actor: string;
                    if (idx === 0) {
                      action = "Created";
                      actor = getUserName(version.modifiedBy || issue.issueRaisedBy);
                    } else if (version.reopenReason) {
                      action = "Reopened";
                      actor = getUserName(version.modifiedBy || version.assignedTo);
                    } else if (version.resolution || version.status === "Resolved") {
                      action = "Resolved";
                      actor = getUserName(version.modifiedBy || (version.resolution ? version.resolution.resolvedBy : version.assignedTo));
                    } else {
                      action = "Edited";
                      actor = getUserName(version.modifiedBy || version.assignedTo);
                    }
                    return { version, idx, action, actor, seqNum: idx + 1 };
                  }).reverse().map(({ version, idx, action, actor, seqNum }) => {
                    let detail: React.ReactNode = null;
                    if (action === "Created") {
                      detail = (
                        <span className="text-xs text-muted-foreground">
                          Assigned to {getUserName(version.assignedTo)}
                          {version.dueDate && <> · Due {format(version.dueDate, "dd MMM yyyy")}</>}
                        </span>
                      );
                    } else if (action === "Reopened") {
                      detail = <span className="text-xs text-amber-700">{version.reopenReason}</span>;
                    } else if (action === "Resolved") {
                      detail = <span className="text-xs text-green-700 line-clamp-2">{version.resolution?.resolutionNotes}</span>;
                    } else {
                      detail = (
                        <span className="text-xs text-muted-foreground">
                          Status: {version.status}
                          {version.dueDate && <> · Due {format(version.dueDate, "dd MMM yyyy")}</>}
                        </span>
                      );
                    }

                    return (
                      <div key={idx} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">V{seqNum}</span>
                            <span className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              TIMELINE_ACTION_STYLES[action] ?? "bg-gray-100 text-gray-700"
                            )}>
                              {action}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {format(parseUtcDate(version.createdDate), "dd MMM yyyy")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-foreground/80">By {actor}</p>
                          {version.changesSummary && version.changesSummary.length > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              title="View changes"
                              onClick={() => {
                                setChangesVersion({ version, action, actor });
                                setChangesOpen(true);
                              }}
                            >
                              <FileSearch className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                        {detail && <div>{detail}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Footer meta */}
          <Separator />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              Raised by {getUserName(issue.issueRaisedBy)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created {format(parseUtcDate(issue.createdAt), "dd MMM yyyy")}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Updated {formatDistanceToNow(parseUtcDate(issue.updatedAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>

      {/* ── Resolve Dialog ── */}
      {isResolvable && (
        <ResolveIssueDialog issue={issue} open={resolveOpen} onOpenChange={setResolveOpen} onSuccess={refreshIssue} />
      )}

      {/* ── Reopen Dialog ── */}
      {isReopenable && (
        <ReopenIssueDialog issue={issue} open={reopenOpen} onOpenChange={setReopenOpen} onSuccess={refreshIssue} />
      )}

      {/* ── Edit Dialog ── */}
      <EditIssueDialog issue={issue} open={editOpen} onOpenChange={setEditOpen} onSuccess={refreshIssue} />

      {/* ── Version History Dialog ── */}
      {issue.currentVersion > 1 && (
        <VersionHistoryDialog issue={issue} open={historyOpen} onOpenChange={setHistoryOpen} />
      )}

      {/* ── Version Changes Dialog (audit diff) ── */}
      {changesVersion && (
        <VersionChangesDialog
          version={changesVersion.version}
          action={changesVersion.action}
          actor={changesVersion.actor}
          open={changesOpen}
          onOpenChange={setChangesOpen}
        />
      )}
    </div>
  );
}
