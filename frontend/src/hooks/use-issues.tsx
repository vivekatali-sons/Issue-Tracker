
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { Issue, IssueFormData, ResolutionFormData, Status, FieldChange } from "@/lib/types";
import type { ApiBulkUploadResult } from "@/lib/api";
import * as api from "@/lib/api";

// ============================================================
// Parse changesSummary JSON string → FieldChange[]
// ============================================================
function parseChangesSummary(json: string | null): FieldChange[] | undefined {
  if (!json) return undefined;
  try {
    return JSON.parse(json) as FieldChange[];
  } catch {
    return undefined;
  }
}

// ============================================================
// Map API list items → frontend Issue (lightweight, no detail)
// ============================================================
function mapListItem(item: api.ApiIssueListItem): Issue {
  return {
    id: item.id,
    processId: item.processId,
    taskId: item.taskId,
    issueDate: item.issueDate,
    issueRaisedBy: item.issueRaisedBy,
    issueTitle: item.issueTitle,
    issueDescription: "",
    attachments: [],
    status: item.status as Status,
    dependentProcesses: [],
    severity: item.severity as Issue["severity"],
    currentVersion: item.currentVersion,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    versions: [],
    resolution: null,
    reopenCount: item.reopenCount,
    assignedTo: item.assignedTo,
    assigningDate: null,
    dueDate: item.dueDate,
  };
}

// ============================================================
// Map API detail → full frontend Issue
// ============================================================
function mapDetail(d: api.ApiIssueDetail): Issue {
  return {
    id: d.id,
    processId: d.processId,
    taskId: d.taskId,
    issueDate: d.issueDate,
    issueRaisedBy: d.issueRaisedBy,
    issueTitle: d.issueTitle,
    issueDescription: d.issueDescription,
    attachments: d.attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      fileSize: a.fileSize,
      contentType: a.contentType,
      dataUrl: a.dataUrl,
    })),
    status: d.status as Status,
    dependentProcesses: d.dependentProcesses,
    severity: d.severity as Issue["severity"],
    currentVersion: d.currentVersion,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    versions: d.versions.map((v) => ({
      versionNumber: v.versionNumber,
      createdDate: v.createdDate,
      dependentProcessesTested: v.dependentProcessesTested.map((t) => ({
        processId: t.processId,
        tested: t.tested,
        testedBy: t.testedBy,
        testDate: t.testDate ?? undefined,
      })),
      assignedTo: v.assignedTo,
      assigningDate: v.assigningDate,
      dueDate: v.dueDate,
      status: v.status as Status,
      reopenReason: v.reopenReason ?? undefined,
      changesSummary: parseChangesSummary(v.changesSummary),
      modifiedBy: v.modifiedBy ?? undefined,
      resolution: v.resolution
        ? {
            resolvedDate: v.resolution.resolvedDate,
            resolvedBy: v.resolution.resolvedBy,
            resolutionNotes: v.resolution.resolutionNotes,
            rootCause: v.resolution.rootCause,
            preventiveMeasures: v.resolution.preventiveMeasures,
            testedBy: v.resolution.testedBy,
            verificationDate: v.resolution.verificationDate ?? "",
            dependentProcessesTestResults: v.resolution.dependentProcessesTestResults.map((t) => ({
              processId: t.processId,
              tested: t.tested,
              testedBy: t.testedBy,
              testDate: t.testDate ?? undefined,
            })),
          }
        : undefined,
    })),
    resolution: d.resolution
      ? {
          resolvedDate: d.resolution.resolvedDate,
          resolvedBy: d.resolution.resolvedBy,
          resolutionNotes: d.resolution.resolutionNotes,
          rootCause: d.resolution.rootCause,
          preventiveMeasures: d.resolution.preventiveMeasures,
          testedBy: d.resolution.testedBy,
          verificationDate: d.resolution.verificationDate ?? "",
          dependentProcessesTestResults: d.resolution.dependentProcessesTestResults.map((t) => ({
            processId: t.processId,
            tested: t.tested,
            testedBy: t.testedBy,
            testDate: t.testDate ?? undefined,
          })),
        }
      : null,
    reopenCount: d.reopenCount,
    assignedTo: d.assignedTo,
    assigningDate: d.assigningDate,
    dueDate: d.dueDate,
  };
}

// ============================================================
// Context type
// ============================================================
interface IssueContextValue {
  issues: Issue[];
  loading: boolean;
  refreshIssues: () => Promise<void>;
  getIssueDetail: (id: number) => Promise<Issue>;
  addIssue: (data: IssueFormData) => Promise<number>;
  updateIssue: (id: number, updates: { issueTitle?: string; issueDescription?: string; status?: Status; assignedTo?: string; assigningDate?: string; dueDate?: string; severity?: string; modifiedBy?: string }) => Promise<void>;
  resolveIssue: (id: number, data: ResolutionFormData) => Promise<void>;
  reopenIssue: (id: number, reason: string, assignedTo: string, dueDate: string | null, modifiedBy?: string) => Promise<void>;
  deleteIssue: (id: number) => Promise<void>;
  bulkUpload: (file: File) => Promise<ApiBulkUploadResult>;
}

const IssueContext = createContext<IssueContextValue | null>(null);

// ============================================================
// Provider
// ============================================================
export function IssueProvider({ children }: { children: ReactNode }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshIssues = useCallback(async () => {
    try {
      const items = await api.fetchIssues();
      setIssues(items.map(mapListItem));
    } catch (err) {
      console.error("Failed to fetch issues:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load issues on mount
  useEffect(() => {
    refreshIssues();
  }, [refreshIssues]);

  const getIssueDetail = useCallback(async (id: number): Promise<Issue> => {
    const detail = await api.fetchIssue(id);
    return mapDetail(detail);
  }, []);

  const addIssue = useCallback(async (data: IssueFormData): Promise<number> => {
    const result = await api.createIssue({
      processId: data.processId,
      taskId: data.taskId,
      issueDate: data.issueDate,
      issueRaisedBy: data.issueRaisedBy,
      issueTitle: data.issueTitle,
      issueDescription: data.issueDescription,
      severity: data.severity,
      assignedTo: data.assignedTo,
      assigningDate: data.assigningDate || null,
      dueDate: data.dueDate || null,
      dependentProcesses: data.dependentProcesses,
      attachments: data.attachments.map((a) => ({
        fileName: a.fileName,
        fileSize: a.fileSize,
        contentType: a.contentType,
        dataUrl: a.dataUrl,
      })),
    });
    await refreshIssues();
    return result.id;
  }, [refreshIssues]);

  const updateIssueHandler = useCallback(async (
    id: number,
    updates: { issueTitle?: string; issueDescription?: string; status?: Status; assignedTo?: string; assigningDate?: string; dueDate?: string; severity?: string; modifiedBy?: string },
  ) => {
    await api.updateIssue(id, {
      issueTitle: updates.issueTitle,
      issueDescription: updates.issueDescription,
      status: updates.status,
      assignedTo: updates.assignedTo,
      assigningDate: updates.assigningDate || null,
      dueDate: updates.dueDate || null,
      severity: updates.severity,
      modifiedBy: updates.modifiedBy,
    });
    await refreshIssues();
  }, [refreshIssues]);

  const resolveIssueHandler = useCallback(async (id: number, data: ResolutionFormData) => {
    await api.resolveIssue(id, {
      resolvedBy: data.resolvedBy,
      resolutionNotes: data.resolutionNotes,
      rootCause: data.rootCause,
      preventiveMeasures: data.preventiveMeasures,
      testedBy: data.testedBy,
      verificationDate: data.verificationDate || null,
      dependentProcessesTestResults: data.dependentProcessesTestResults.map((t) => ({
        processId: t.processId,
        tested: t.tested,
        testedBy: t.testedBy,
        testDate: t.testDate ?? null,
      })),
    });
    await refreshIssues();
  }, [refreshIssues]);

  const reopenIssueHandler = useCallback(async (id: number, reason: string, assignedTo: string, dueDate: string | null, modifiedBy?: string) => {
    await api.reopenIssue(id, {
      reopenReason: reason,
      assignedTo,
      dueDate,
      modifiedBy,
    });
    await refreshIssues();
  }, [refreshIssues]);

  const deleteIssueHandler = useCallback(async (id: number) => {
    await api.deleteIssue(id);
    await refreshIssues();
  }, [refreshIssues]);

  const bulkUploadHandler = useCallback(async (file: File): Promise<ApiBulkUploadResult> => {
    const result = await api.bulkUploadIssues(file);
    await refreshIssues();
    return result;
  }, [refreshIssues]);

  return (
    <IssueContext.Provider
      value={{
        issues,
        loading,
        refreshIssues,
        getIssueDetail,
        addIssue,
        updateIssue: updateIssueHandler,
        resolveIssue: resolveIssueHandler,
        reopenIssue: reopenIssueHandler,
        deleteIssue: deleteIssueHandler,
        bulkUpload: bulkUploadHandler,
      }}
    >
      {children}
    </IssueContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================
export function useIssues() {
  const context = useContext(IssueContext);
  if (!context) throw new Error("useIssues must be used within <IssueProvider>");
  return context;
}
