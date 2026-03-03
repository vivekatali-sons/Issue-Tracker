
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIssues } from "@/hooks/use-issues";
import { useAuth } from "@/hooks/use-auth";
import { useMasterData } from "@/hooks/use-master-data";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { FormField } from "@/components/shared/form-field";
import { SectionHeader } from "@/components/shared/section-header";
import { DatePicker } from "@/components/shared/date-picker";
import { FileUploadZone } from "@/components/shared/file-upload-zone";
import type { FileAttachment } from "@/lib/types";

// ============================================================
// Sanitization — strips HTML tags to prevent stored XSS
// ============================================================
function sanitize(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

// ============================================================
// Validation
// ============================================================
interface FormErrors {
  processId?: string;
  taskId?: string;
  issueRaisedBy?: string;
  severity?: string;
  assignedTo?: string;
  issueTitle?: string;
  issueDescription?: string;
  dueDate?: string;
}

function validateForm(form: {
  processId: string;
  taskId: string;
  issueRaisedBy: string;
  severity: string;
  assignedTo: string;
  issueTitle: string;
  issueDescription: string;
  issueDate: Date;
  dueDate: Date | undefined;
}): FormErrors {
  const errors: FormErrors = {};

  if (!form.processId) errors.processId = "Process is required";
  if (!form.taskId) errors.taskId = form.processId ? "Task is required" : "Select a process first";
  if (!form.issueRaisedBy) errors.issueRaisedBy = "Raised By is required";
  if (!form.severity) errors.severity = "Severity is required";
  if (!form.assignedTo) errors.assignedTo = "Assigned To is required";

  const title = sanitize(form.issueTitle);
  if (!title) {
    errors.issueTitle = "Issue title is required";
  } else if (title.length < 3) {
    errors.issueTitle = "Title must be at least 3 characters";
  } else if (title.length > 200) {
    errors.issueTitle = "Title must not exceed 200 characters";
  }

  const desc = sanitize(form.issueDescription);
  if (!desc) {
    errors.issueDescription = "Description is required";
  } else if (desc.length < 5) {
    errors.issueDescription = "Description must be at least 5 characters";
  }

  if (form.dueDate && form.dueDate < stripTime(form.issueDate)) {
    errors.dueDate = "Due date cannot be before the issue date";
  }

  return errors;
}

function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// ============================================================
// Page
// ============================================================
export default function NewIssuePage() {
  const navigate = useNavigate();
  const { addIssue } = useIssues();
  const { user, permissions } = useAuth();

  if (!permissions.canCreateIssue) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">You do not have permission to create issues.</p>
      </div>
    );
  }
  const { processes: masterProcesses, users: masterUsers, severities: masterSeverities, getTasksForProcess } = useMasterData();

  // --- Form state ---
  const [processId, setProcessId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [issueRaisedBy, setIssueRaisedBy] = useState(user?.id ?? "");
  const [issueDate, setIssueDate] = useState<Date>(new Date());
  const [severity, setSeverity] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [assigningDate, setAssigningDate] = useState<Date | undefined>(undefined);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [dependentProcesses, setDependentProcesses] = useState<string[]>([]);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const availableTasks = processId ? getTasksForProcess(processId) : [];

  // --- Handlers ---
  const handleProcessChange = (value: string) => {
    setProcessId(value);
    setTaskId("");
    setDependentProcesses((prev) => prev.filter((id) => id !== value));
    if (submitted) setErrors((prev) => ({ ...prev, processId: undefined, taskId: undefined }));
  };

  const handleDependentToggle = (pid: string, checked: boolean) => {
    setDependentProcesses((prev) =>
      checked ? [...prev, pid] : prev.filter((id) => id !== pid)
    );
  };

  const clearField = (field: keyof FormErrors) => {
    if (submitted) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitted(true);

    const validationErrors = validateForm({
      processId,
      taskId,
      issueRaisedBy,
      severity,
      assignedTo,
      issueTitle,
      issueDescription,
      issueDate,
      dueDate,
    });

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      toast.error("Please fix the highlighted errors before submitting");
      return;
    }

    setSubmitting(true);
    try {
      const newId = await addIssue({
        processId,
        taskId,
        issueDate: issueDate.toISOString(),
        issueRaisedBy,
        issueTitle: sanitize(issueTitle),
        issueDescription: sanitize(issueDescription),
        attachments,
        status: "New",
        dependentProcesses,
        severity,
        assignedTo,
        assigningDate: assigningDate ? assigningDate.toISOString() : "",
        dueDate: dueDate ? dueDate.toISOString() : "",
      });

      toast.success("Issue created successfully");
      navigate(`/issues/detail?id=${newId}`);
    } catch (err) {
      toast.error("Failed to create issue");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================================
  // Render
  // ==========================================================
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* ── Breadcrumb ── */}
      <Breadcrumb items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Issues", href: "/issues" },
        { label: "New Issue" },
      ]} />

      {/* ── Main Card ── */}
      <div className="rounded-xl border bg-card shadow-md overflow-hidden">
        {/* Header */}
        <div className="border-b px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Plus className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Create New Issue</h1>
                <p className="text-sm text-muted-foreground">Fill in the details below to raise a new issue</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/issues")}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={submitting} className="gap-1.5">
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {submitting ? "Creating..." : "Create Issue"}
              </Button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 sm:px-8 space-y-0">

          {/* ── Section: Basic Information ── */}
          <SectionHeader title="Basic Information" first />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField label="Process" required error={errors.processId}>
              <Select value={processId} onValueChange={handleProcessChange}>
                <SelectTrigger className={cn("w-full", errors.processId && "border-red-500")}>
                  <SelectValue placeholder="Select Process" />
                </SelectTrigger>
                <SelectContent>
                  {masterProcesses.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Task" required error={errors.taskId}>
              <Select
                value={taskId}
                onValueChange={(v) => { setTaskId(v); clearField("taskId"); }}
                disabled={!processId}
              >
                <SelectTrigger className={cn("w-full", errors.taskId && "border-red-500")}>
                  <SelectValue placeholder={processId ? "Select Task" : "Select a process first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableTasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Raised By" required error={errors.issueRaisedBy}>
              <Select
                value={issueRaisedBy}
                onValueChange={(v) => { setIssueRaisedBy(v); clearField("issueRaisedBy"); }}
              >
                <SelectTrigger className={cn("w-full", errors.issueRaisedBy && "border-red-500")}>
                  <SelectValue placeholder="Select User" />
                </SelectTrigger>
                <SelectContent>
                  {masterUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Issue Date">
              <DatePicker date={issueDate} onSelect={(d) => d && setIssueDate(d)} />
            </FormField>

            <FormField label="Severity" required error={errors.severity}>
              <Select
                value={severity}
                onValueChange={(v) => { setSeverity(v); clearField("severity"); }}
              >
                <SelectTrigger className={cn("w-full", errors.severity && "border-red-500")}>
                  <SelectValue placeholder="Select Severity" />
                </SelectTrigger>
                <SelectContent>
                  {masterSeverities.map((s) => (
                    <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          {/* ── Section: Description ── */}
          <SectionHeader title="Description" />

          <div className="space-y-6">
            <FormField label="Issue Title" required error={errors.issueTitle}>
              <Input
                placeholder="Brief description of the issue"
                value={issueTitle}
                onChange={(e) => { setIssueTitle(e.target.value); clearField("issueTitle"); }}
                maxLength={200}
                className={cn(errors.issueTitle && "border-red-500")}
              />
              <div className="flex justify-end">
                <span className="text-xs text-muted-foreground">{issueTitle.length}/200</span>
              </div>
            </FormField>

            <FormField label="Detailed Description" required error={errors.issueDescription}>
              <Textarea
                placeholder="Detailed description of the issue, steps to reproduce, expected behavior..."
                value={issueDescription}
                onChange={(e) => { setIssueDescription(e.target.value); clearField("issueDescription"); }}
                className={cn("min-h-[140px]", errors.issueDescription && "border-red-500")}
              />
            </FormField>
          </div>

          {/* ── Section: Assignment Details ── */}
          <SectionHeader title="Assignment Details" />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField label="Assigned To" required error={errors.assignedTo}>
              <Select
                value={assignedTo}
                onValueChange={(v) => { setAssignedTo(v); clearField("assignedTo"); }}
              >
                <SelectTrigger className={cn("w-full", errors.assignedTo && "border-red-500")}>
                  <SelectValue placeholder="Select Assignee" />
                </SelectTrigger>
                <SelectContent>
                  {masterUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Assigning Date">
              <DatePicker date={assigningDate} onSelect={setAssigningDate} placeholder="dd/mm/yyyy" />
            </FormField>

            <FormField label="Due Date" error={errors.dueDate}>
              <DatePicker
                date={dueDate}
                onSelect={(d) => { setDueDate(d); clearField("dueDate"); }}
                placeholder="dd/mm/yyyy"
              />
            </FormField>
          </div>

          {/* ── Section: Dependencies ── */}
          <SectionHeader title="Dependencies" />

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Dependent Processes
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">(Multiple Selection)</span>
            </Label>
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {masterProcesses.filter((p) => p.id !== processId).map((p) => (
                <div key={p.id} className="flex items-center gap-2.5">
                  <Checkbox
                    id={`dep-${p.id}`}
                    checked={dependentProcesses.includes(p.id)}
                    onCheckedChange={(checked) => handleDependentToggle(p.id, checked === true)}
                  />
                  <Label htmlFor={`dep-${p.id}`} className="text-sm font-normal cursor-pointer">
                    {p.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* ── Section: Attachments ── */}
          <SectionHeader title="Attachments" />

          <div className="space-y-2">
            <Label className="text-sm font-medium">Files</Label>
            <FileUploadZone attachments={attachments} onChange={setAttachments} />
          </div>

          {/* ── Footer Actions ── */}
          <div className="border-t border-border/40 mt-8 pt-6 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => navigate("/issues")} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {submitting ? "Creating..." : "Create Issue"}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}

