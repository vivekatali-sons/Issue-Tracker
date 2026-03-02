
import { useState, useRef, useCallback } from "react";
import { CheckCircle2, Loader2, CircleCheck } from "lucide-react";
import { format } from "date-fns";
import { parseUtcDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/shared/date-picker";
import { useMasterData } from "@/hooks/use-master-data";
import { useAuth } from "@/hooks/use-auth";
import { useIssues } from "@/hooks/use-issues";
import type { Issue, DependentProcessTestResult } from "@/lib/types";
import type { ApiMasterProcess } from "@/lib/api";

const NOTES_MAX = 1000;

/* ── Softer required field wrapper ── */
function Field({
  label,
  required,
  error,
  valid,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  valid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">{label}</Label>
        {required && !error && !valid && (
          <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Required</span>
        )}
        {valid && <CircleCheck className="h-3.5 w-3.5 text-green-500" />}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/* ── Section divider ── */
function Section({ title, first }: { title: string; first?: boolean }) {
  return (
    <div className={first ? "mb-5" : "border-t border-border/40 mt-7 pt-5 mb-5"}>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
        {title}
      </h3>
    </div>
  );
}

interface ResolveIssueDialogProps {
  issue: Issue;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ResolveIssueDialog({ issue, open, onOpenChange, onSuccess }: ResolveIssueDialogProps) {
  const { resolveIssue } = useIssues();
  const { user } = useAuth();
  const { users: masterUsers, processes: masterProcesses, getUserName, getProcessName } = useMasterData();

  // Auto-fill resolved by with current user
  const [resolvedBy, setResolvedBy] = useState(user?.id ?? "");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [preventiveMeasures, setPreventiveMeasures] = useState("");
  const [testedBy, setTestedBy] = useState<string[]>([]);
  const [verificationDate, setVerificationDate] = useState<Date | undefined>(new Date());
  const [depResults, setDepResults] = useState<DependentProcessTestResult[]>(
    issue.dependentProcesses.map((pid) => ({
      processId: pid,
      tested: false,
      testedBy: [],
    })),
  );

  const [errors, setErrors] = useState<{
    resolvedBy?: string;
    resolutionNotes?: string;
    depProcesses?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [headerShadow, setHeaderShadow] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasDeps = issue.dependentProcesses.length > 0;
  const allDepsTested = depResults.every((r) => r.tested);
  const isFormValid =
    resolvedBy !== "" &&
    resolutionNotes.trim().length > 0 &&
    (!hasDeps || allDepsTested);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    setHeaderShadow(scrollRef.current.scrollTop > 0);
  }, []);

  const toggleTestedBy = (userId: string) => {
    setTestedBy((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const updateDepTested = (processId: string, tested: boolean) => {
    setDepResults((prev) =>
      prev.map((r) => (r.processId === processId ? { ...r, tested } : r)),
    );
    setErrors((e) => ({ ...e, depProcesses: undefined }));
  };

  const toggleDepTestedBy = (processId: string, userId: string) => {
    setDepResults((prev) =>
      prev.map((r) => {
        if (r.processId !== processId) return r;
        const has = r.testedBy.includes(userId);
        return {
          ...r,
          testedBy: has ? r.testedBy.filter((id) => id !== userId) : [...r.testedBy, userId],
        };
      }),
    );
  };

  const handleSubmit = async () => {
    const newErrors: typeof errors = {};
    if (!resolvedBy) newErrors.resolvedBy = "Please select who resolved this issue";
    if (!resolutionNotes.trim()) newErrors.resolutionNotes = "Please describe how the issue was resolved";
    if (hasDeps && !allDepsTested) newErrors.depProcesses = "Please confirm all dependent processes have been tested";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);
    try {
      await resolveIssue(issue.id, {
        resolvedBy,
        resolutionNotes: resolutionNotes.trim(),
        rootCause: rootCause.trim(),
        preventiveMeasures: preventiveMeasures.trim(),
        testedBy,
        verificationDate: verificationDate?.toISOString() ?? new Date().toISOString(),
        dependentProcessesTestResults: depResults,
      });

      toast.success("Issue marked as Resolved", {
        description: `${issue.issueTitle} has been resolved by ${getUserName(resolvedBy)}.`,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error("Failed to resolve issue");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[860px] max-h-[90vh] sm:max-h-[85vh] overflow-hidden p-0 gap-0"
        showCloseButton={false}
      >
        <div className="flex flex-col max-h-[90vh] sm:max-h-[85vh]">
          {/* ══════════════ Sticky Header ══════════════ */}
          <div
            className={`shrink-0 px-4 sm:px-6 py-4 border-b bg-background transition-shadow duration-150 ${
              headerShadow ? "shadow-sm" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10 shrink-0">
                <CheckCircle2 className="h-[18px] w-[18px] text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-[17px] font-semibold leading-tight">Resolve Issue</DialogTitle>
                <DialogDescription className="text-[13px] text-muted-foreground truncate mt-0.5">
                  {issue.issueTitle}
                </DialogDescription>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          </div>

          {/* ══════════════ Scrollable Body ══════════════ */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 py-5"
          >
            {/* ── Issue Summary Panel ── */}
            <div className="rounded-lg border bg-muted/30 p-4 mb-1">
              <h4 className="text-sm font-semibold text-foreground mb-1.5">{issue.issueTitle}</h4>
              <p className="text-[13px] text-muted-foreground line-clamp-2 mb-3">{issue.issueDescription}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground/70">ID:</span>{" "}
                  <span className="font-mono">#{issue.id}</span>
                </span>
                <span className="hidden sm:inline text-border">|</span>
                <span>
                  <span className="font-medium text-foreground/70">Created:</span>{" "}
                  {format(parseUtcDate(issue.createdAt), "dd MMM yyyy")}
                </span>
                <span className="hidden sm:inline text-border">|</span>
                <span className="flex items-center gap-1">
                  <span className="font-medium text-foreground/70">Severity:</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${
                    issue.severity === "Critical" ? "bg-red-100 text-red-700" :
                    issue.severity === "High" ? "bg-orange-100 text-orange-700" :
                    issue.severity === "Medium" ? "bg-yellow-100 text-yellow-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {issue.severity}
                  </span>
                </span>
                <span className="hidden sm:inline text-border">|</span>
                <span>
                  <span className="font-medium text-foreground/70">Process:</span>{" "}
                  {getProcessName(issue.processId)}
                </span>
              </div>
            </div>

            {/* ── 1. Resolution Details: Resolved By + Resolution Notes ── */}
            <Section title="Resolution Details" first />

            <Field label="Resolved By" required error={errors.resolvedBy} valid={!!resolvedBy}>
              <Select value={resolvedBy} onValueChange={(v) => { setResolvedBy(v); setErrors((e) => ({ ...e, resolvedBy: undefined })); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  {masterUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="mt-5">
              <Field label="Resolution Notes" required error={errors.resolutionNotes} valid={resolutionNotes.trim().length > 0}>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => {
                    if (e.target.value.length <= NOTES_MAX) {
                      setResolutionNotes(e.target.value);
                      setErrors((er) => ({ ...er, resolutionNotes: undefined }));
                    }
                  }}
                  placeholder="e.g. Updated VIN validation regex to exclude invalid characters and added checksum verification."
                  rows={4}
                  autoFocus
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-[11px] tabular-nums ${resolutionNotes.length >= NOTES_MAX ? "text-destructive" : "text-muted-foreground/50"}`}>
                    {resolutionNotes.length} / {NOTES_MAX}
                  </span>
                </div>
              </Field>
            </div>

            {/* ── 2. Root Cause & Prevention ── */}
            <Section title="Root Cause & Prevention" />

            <Field label="Root Cause Analysis">
              <Textarea
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                placeholder="What was the underlying cause?"
                rows={3}
              />
            </Field>

            <div className="mt-5">
              <Field label="Preventive Measures">
                <Textarea
                  value={preventiveMeasures}
                  onChange={(e) => setPreventiveMeasures(e.target.value)}
                  placeholder="Steps to prevent recurrence..."
                  rows={3}
                />
              </Field>
            </div>

            {/* ── 3. Dependent Process Testing (conditional) ── */}
            {hasDeps && (
              <>
                <Section title="Dependent Process Testing" />
                <p className="text-[13px] text-muted-foreground -mt-3 mb-4">
                  Please confirm that each dependent process has been tested after the fix.
                </p>
                {errors.depProcesses && (
                  <p className="text-xs text-destructive mb-3">{errors.depProcesses}</p>
                )}

                <div className="space-y-3">
                  {depResults.map((dep) => {
                    const process = masterProcesses.find((p: ApiMasterProcess) => p.id === dep.processId);
                    return (
                      <div
                        key={dep.processId}
                        className={`rounded-lg border p-4 space-y-3 transition-colors ${
                          dep.tested
                            ? "bg-green-50/60 border-green-200"
                            : "bg-muted/20 border-border"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={dep.tested}
                            onCheckedChange={(checked) => updateDepTested(dep.processId, !!checked)}
                          />
                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-medium text-foreground">{process?.name ?? dep.processId}</h5>
                            {process?.description && (
                              <p className="text-xs text-muted-foreground">{process.description}</p>
                            )}
                          </div>
                          {dep.tested && (
                            <span className="text-green-600 font-semibold text-sm shrink-0">✓ Tested</span>
                          )}
                        </div>

                        {dep.tested && (
                          <div className="pl-7">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Tested By (Multiple Selection)</p>
                            <div className="grid grid-cols-2 gap-2">
                              {masterUsers.map((u) => (
                                <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                  <Checkbox
                                    checked={dep.testedBy.includes(u.id)}
                                    onCheckedChange={() => toggleDepTestedBy(dep.processId, u.id)}
                                    className="h-4 w-4"
                                  />
                                  {u.name}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── 4. Overall Tested/Verified By (always shown) ── */}
            <Section title="Verification" />

            <Field label="Overall Tested / Verified By (Multiple Selection)">
              <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/20 p-4 sm:grid-cols-3">
                {masterUsers.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={testedBy.includes(u.id)}
                      onCheckedChange={() => toggleTestedBy(u.id)}
                      className="h-4 w-4"
                    />
                    {u.name}
                  </label>
                ))}
              </div>
            </Field>

            {/* ── 5. Verification Date ── */}
            <div className="mt-5">
              <Field label="Verification Date">
                <DatePicker date={verificationDate} onSelect={setVerificationDate} />
              </Field>
            </div>
          </div>

          {/* ══════════════ Fixed Footer ══════════════ */}
          <div className="shrink-0 border-t bg-muted/30 px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground/60 hidden sm:block">
                This will move the issue to <span className="font-medium">Resolved</span> status.
              </p>
              <div className="flex items-center gap-3 ml-auto">
                <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!isFormValid || isSubmitting}
                  className="gap-1.5 bg-green-600 hover:bg-green-700 text-white px-5"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {isSubmitting ? "Resolving..." : "Mark as Resolved"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
