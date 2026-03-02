// ============================================================
// Centralized API client — single source for all backend calls
// ============================================================

import { getApiUrl } from "./config";

// Session token storage — set after verify-token, sent with every API call
const SESSION_TOKEN_KEY = "session_token";

export function setSessionToken(token: string) {
  sessionStorage.setItem(SESSION_TOKEN_KEY, token);
}

export function getSessionToken(): string | null {
  return sessionStorage.getItem(SESSION_TOKEN_KEY);
}

export function clearSessionToken() {
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const apiBase = await getApiUrl();
  const sessionToken = getSessionToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(sessionToken ? { "X-Session-Token": sessionToken } : {}),
    ...(options?.headers as Record<string, string>),
  };
  const res = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`API ${res.status}: ${body || res.statusText}`);
    (err as any).status = res.status;
    try { (err as any).body = JSON.parse(body); } catch { /* not JSON */ }
    throw err;
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

// ── Issues ──

export function fetchIssues() {
  return request<ApiIssueListItem[]>("/api/issues");
}

export function fetchIssue(id: number) {
  return request<ApiIssueDetail>(`/api/issues/${id}`);
}

export function createIssue(data: ApiCreateIssueRequest) {
  return request<{ id: number }>("/api/issues", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateIssue(id: number, data: ApiUpdateIssueRequest) {
  return request<void>(`/api/issues/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteIssue(id: number) {
  return request<void>(`/api/issues/${id}`, { method: "DELETE" });
}

export function resolveIssue(id: number, data: ApiResolveIssueRequest) {
  return request<void>(`/api/issues/${id}/resolve`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function reopenIssue(id: number, data: ApiReopenIssueRequest) {
  return request<void>(`/api/issues/${id}/reopen`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ============================================================
// API DTOs — match the backend exactly
// ============================================================

export interface ApiIssueListItem {
  id: number;
  processId: string;
  taskId: string;
  issueTitle: string;
  status: string;
  severity: string;
  assignedTo: string;
  issueRaisedBy: string;
  issueDate: string;
  dueDate: string | null;
  currentVersion: number;
  reopenCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiFileAttachment {
  id: number;
  issueId: number;
  fileName: string;
  fileSize: number;
  contentType: string;
  dataUrl: string;
}

export interface ApiDependentProcessTestResult {
  id: number;
  resolutionId: number | null;
  versionId: number | null;
  processId: string;
  tested: boolean;
  testDate: string | null;
  testedBy: string[];
}

export interface ApiResolution {
  id: number;
  issueId: number;
  versionNumber: number;
  resolvedDate: string;
  resolvedBy: string;
  resolutionNotes: string;
  rootCause: string;
  preventiveMeasures: string;
  verificationDate: string | null;
  testedBy: string[];
  dependentProcessesTestResults: ApiDependentProcessTestResult[];
}

export interface ApiIssueVersion {
  id: number;
  issueId: number;
  versionNumber: number;
  createdDate: string;
  assignedTo: string;
  assigningDate: string | null;
  dueDate: string | null;
  status: string;
  reopenReason: string | null;
  changesSummary: string | null;
  modifiedBy: string | null;
  dependentProcessesTested: ApiDependentProcessTestResult[];
  resolution: ApiResolution | null;
}

export interface ApiIssueDetail {
  id: number;
  processId: string;
  taskId: string;
  issueDate: string;
  issueRaisedBy: string;
  issueTitle: string;
  issueDescription: string;
  status: string;
  severity: string;
  assignedTo: string;
  assigningDate: string | null;
  dueDate: string | null;
  currentVersion: number;
  reopenCount: number;
  createdAt: string;
  updatedAt: string;
  dependentProcesses: string[];
  attachments: ApiFileAttachment[];
  versions: ApiIssueVersion[];
  resolution: ApiResolution | null;
}

export interface ApiCreateIssueRequest {
  processId: string;
  taskId: string;
  issueDate: string;
  issueRaisedBy: string;
  issueTitle: string;
  issueDescription: string;
  severity: string;
  assignedTo: string;
  assigningDate: string | null;
  dueDate: string | null;
  dependentProcesses: string[];
  attachments: { fileName: string; fileSize: number; contentType: string; dataUrl: string }[];
}

export interface ApiUpdateIssueRequest {
  issueTitle?: string;
  issueDescription?: string;
  status?: string;
  assignedTo?: string;
  assigningDate?: string | null;
  dueDate?: string | null;
  severity?: string;
  modifiedBy?: string;
}

export interface ApiResolveIssueRequest {
  resolvedBy: string;
  resolutionNotes: string;
  rootCause: string;
  preventiveMeasures: string;
  testedBy: string[];
  verificationDate: string | null;
  dependentProcessesTestResults: {
    processId: string;
    tested: boolean;
    testedBy: string[];
    testDate: string | null;
  }[];
}

export interface ApiReopenIssueRequest {
  reopenReason: string;
  assignedTo: string;
  dueDate: string | null;
  modifiedBy?: string;
}

// ── Bulk Upload ──

export interface ApiBulkUploadRowError {
  rowNumber: number;
  srNumber: string | null;
  errors: string[];
}

export interface ApiBulkUploadResult {
  totalRows: number;
  successCount: number;
  failedCount: number;
  createdIssueIds: number[];
  failedRows: ApiBulkUploadRowError[];
}

// ── Master Data ──

export interface ApiMasterStatus {
  id: number;
  name: string;
  label: string;
  textColor: string;
  bgColor: string;
  chartColor: string;
  displayOrder: number;
}

export interface ApiMasterSeverity {
  id: number;
  name: string;
  label: string;
  textColor: string;
  bgColor: string;
  displayOrder: number;
}

export interface ApiMasterProcess {
  id: string;
  name: string;
  description: string;
  displayOrder: number;
}

export interface ApiMasterTask {
  id: string;
  name: string;
  processId: string;
  displayOrder: number;
}

export interface ApiMasterUser {
  id: string;
  name: string;
  email: string;
  displayOrder: number;
}

export interface ApiMasterDataResponse {
  statuses: ApiMasterStatus[];
  severities: ApiMasterSeverity[];
  processes: ApiMasterProcess[];
  tasks: ApiMasterTask[];
  users: ApiMasterUser[];
}

export function fetchMasterData() {
  return request<ApiMasterDataResponse>("/api/master");
}

// ── Auth (verify EDP token) ──

export interface EnsureUserResponse {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  canCreateIssue: boolean;
  canEditIssue: boolean;
  canResolveIssue: boolean;
  canBulkUpload: boolean;
  canAccessAdmin: boolean;
  isBlocked: boolean;
}

export interface VerifyTokenResponse {
  user: EnsureUserResponse;
  sessionToken: string;
}

export function verifyToken(token: string) {
  return request<VerifyTokenResponse>("/api/auth/verify-token", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

// ── Bulk Upload ──

export async function bulkUploadIssues(file: File): Promise<ApiBulkUploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  const apiBase = await getApiUrl();
  const sessionToken = getSessionToken();
  const res = await fetch(`${apiBase}/api/issues/bulk`, {
    method: "POST",
    body: formData,
    headers: sessionToken ? { "X-Session-Token": sessionToken } : {},
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }

  return res.json();
}
