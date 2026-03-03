// ============================================================
// Single source of truth for all data shapes in the app
// ============================================================

export type Status = string;

export type Severity = string;

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Process {
  id: string;
  name: string;
  description: string;
}

export interface Task {
  id: string;
  name: string;
  processId: string;
}

export interface DependentProcessTestResult {
  processId: string;
  tested: boolean;
  testedBy: string[];
  testDate?: string;
}

export interface Resolution {
  resolvedDate: string;
  resolvedBy: string;
  resolutionNotes: string;
  rootCause: string;
  preventiveMeasures: string;
  testedBy: string[];
  verificationDate: string;
  dependentProcessesTestResults: DependentProcessTestResult[];
}

export interface FieldChange {
  field: string;
  from: string | null;
  to: string | null;
}

export interface IssueVersion {
  versionNumber: number;
  createdDate: string;
  dependentProcessesTested: DependentProcessTestResult[];
  assignedTo: string;
  assigningDate: string | null;
  dueDate: string | null;
  status: Status;
  resolution?: Resolution;
  reopenReason?: string;
  changesSummary?: FieldChange[];
  modifiedBy?: string;
}

export interface Issue {
  id: number;
  processId: string;
  taskId: string;
  issueDate: string;
  issueRaisedBy: string;
  issueTitle: string;
  issueDescription: string;
  attachments: FileAttachment[];
  status: Status;
  dependentProcesses: string[];
  severity: Severity;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  versions: IssueVersion[];
  resolution: Resolution | null;
  reopenCount: number;
  assignedTo: string;
  assigningDate: string | null;
  dueDate: string | null;
}

export interface FileAttachment {
  id: number;
  fileName: string;
  fileSize: number;
  contentType: string;
  dataUrl: string;
}

// Form data shapes for creating/editing
export interface IssueFormData {
  processId: string;
  taskId: string;
  issueDate: string;
  issueRaisedBy: string;
  issueTitle: string;
  issueDescription: string;
  attachments: FileAttachment[];
  status: Status;
  dependentProcesses: string[];
  severity: Severity;
  assignedTo: string;
  assigningDate: string;
  dueDate: string;
}

export interface ResolutionFormData {
  resolvedBy: string;
  resolutionNotes: string;
  rootCause: string;
  preventiveMeasures: string;
  testedBy: string[];
  verificationDate: string;
  dependentProcessesTestResults: DependentProcessTestResult[];
}

// Navigation
export interface NavItem {
  title: string;
  href: string;
  icon: string;
}
