
import { useState } from "react";
import { Edit, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/shared/form-field";
import { SectionHeader } from "@/components/shared/section-header";
import { DatePicker } from "@/components/shared/date-picker";
import { useMasterData } from "@/hooks/use-master-data";
import { useIssues } from "@/hooks/use-issues";
import { useAuth } from "@/hooks/use-auth";
import type { Issue } from "@/lib/types";

const EDITABLE_STATUSES = ["New", "Open", "In Progress", "Testing"];

interface EditIssueDialogProps {
  issue: Issue;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditIssueDialog({ issue, open, onOpenChange, onSuccess }: EditIssueDialogProps) {
  const { updateIssue } = useIssues();
  const { users: masterUsers, severities: masterSeverities } = useMasterData();
  const { user } = useAuth();
  const latestVersion = issue.versions[issue.versions.length - 1];

  const [title, setTitle] = useState(issue.issueTitle);
  const [description, setDescription] = useState(issue.issueDescription);
  const [severity, setSeverity] = useState(issue.severity);
  const [status, setStatus] = useState(issue.status);
  const [assignedTo, setAssignedTo] = useState(latestVersion.assignedTo);
  const [assigningDate, setAssigningDate] = useState<Date | undefined>(latestVersion.assigningDate ? new Date(latestVersion.assigningDate) : undefined);
  const [dueDate, setDueDate] = useState<Date | undefined>(latestVersion.dueDate ? new Date(latestVersion.dueDate) : undefined);

  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compare dates by YYYY-MM-DD to avoid time-component false positives
  const dateStr = (d: Date | undefined) => d ? d.toISOString().slice(0, 10) : "";
  const origAssigningDate = latestVersion.assigningDate ? new Date(latestVersion.assigningDate).toISOString().slice(0, 10) : "";
  const origDueDate = latestVersion.dueDate ? new Date(latestVersion.dueDate).toISOString().slice(0, 10) : "";

  const hasChanges =
    title !== issue.issueTitle ||
    description !== issue.issueDescription ||
    severity !== issue.severity ||
    status !== issue.status ||
    assignedTo !== latestVersion.assignedTo ||
    dateStr(assigningDate) !== origAssigningDate ||
    dateStr(dueDate) !== origDueDate;

  const handleSubmit = async () => {
    const newErrors: typeof errors = {};
    if (!title.trim()) newErrors.title = "Required";
    if (!description.trim()) newErrors.description = "Required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await updateIssue(issue.id, {
        issueTitle: title.trim(),
        issueDescription: description.trim(),
        severity,
        status,
        assignedTo,
        assigningDate: assigningDate?.toISOString() ?? "",
        dueDate: dueDate?.toISOString() ?? "",
        modifiedBy: user?.id,
      });

      toast.success("Issue updated successfully");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error("Failed to update issue");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isSubmitting) onOpenChange(v); }}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl p-0">
        {/* Fixed header */}
        <DialogHeader className="flex-shrink-0 border-b bg-muted/40 dark:bg-white/[0.03] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Edit className="h-[18px] w-[18px] text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">Edit Issue</DialogTitle>
              <DialogDescription className="mt-0.5">
                <span className="font-mono font-medium">#{issue.id}</span> &middot; {issue.issueTitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
          {/* ── Issue Details ── */}
          <SectionHeader title="Issue Details" first />

          <FormField label="Issue Title" required error={errors.title}>
            <Input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setErrors((er) => ({ ...er, title: undefined })); }}
              placeholder="Brief description of the issue"
            />
          </FormField>

          <FormField label="Description" required error={errors.description}>
            <Textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); setErrors((er) => ({ ...er, description: undefined })); }}
              placeholder="Detailed explanation of the issue..."
              rows={4}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Status">
              <Select value={status} onValueChange={(v) => setStatus(v)}>
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDITABLE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Severity">
              <Select value={severity} onValueChange={(v) => setSeverity(v)}>
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {masterSeverities.map((s) => (
                    <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          {/* ── Assignment ── */}
          <SectionHeader title="Assignment" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Assigned To">
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  {masterUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Assigning Date">
              <DatePicker date={assigningDate} onSelect={setAssigningDate} />
            </FormField>

            <FormField label="Due Date">
              <DatePicker date={dueDate} onSelect={setDueDate} />
            </FormField>
          </div>
        </div>

        {/* Fixed footer */}
        <DialogFooter className="flex-shrink-0 border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !hasChanges} className="gap-1.5">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="h-4 w-4" />}
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
