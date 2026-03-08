
import { useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { useIssues } from "@/hooks/use-issues";
import { useAuth } from "@/hooks/use-auth";
import type { Issue } from "@/lib/types";

interface ReopenIssueDialogProps {
  issue: Issue;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ReopenIssueDialog({ issue, open, onOpenChange, onSuccess }: ReopenIssueDialogProps) {
  const { reopenIssue } = useIssues();
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError("Please provide a reason for reopening");
      return;
    }

    setIsSubmitting(true);
    try {
      await reopenIssue(issue.id, reason.trim(), issue.assignedTo, issue.dueDate, user?.id);
      toast.success(`Issue reopened — now at Version ${issue.currentVersion + 1}`);
      setReason("");
      setError("");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error("Failed to reopen issue");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isSubmitting) onOpenChange(v); }}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg p-0">
        <DialogHeader className="flex-shrink-0 border-b bg-muted/40 dark:bg-white/[0.03] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
              <RotateCcw className="h-[18px] w-[18px] text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-base">Reopen Issue</DialogTitle>
              <DialogDescription className="mt-0.5">
                {issue.issueTitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm text-amber-800">
            This will create <span className="font-semibold">Version {issue.currentVersion + 1}</span> and reset the resolution.
            The issue will be reassigned to the previous owner.
          </div>

          <FormField label="Reason for Reopening" required error={error}>
            <Textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(""); }}
              placeholder="Explain why this issue needs to be reopened..."
              rows={4}
            />
          </FormField>
        </div>

        <DialogFooter className="flex-shrink-0 border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {isSubmitting ? "Reopening..." : "Reopen Issue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
