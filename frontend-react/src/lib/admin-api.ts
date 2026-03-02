// ============================================================
// Admin API client — all admin portal backend calls
// ============================================================

import { getApiUrl } from "./config";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("admin_token");
}

async function adminRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const apiBase = await getApiUrl();
  const token = getToken();
  const res = await fetch(`${apiBase}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-Admin-Token": token } : {}),
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    if (res.status === 401 && !path.includes("/login")) {
      sessionStorage.removeItem("admin_token");
      sessionStorage.removeItem("admin_username");
      window.location.href = "/admin/login";
      throw new Error("Session expired. Redirecting to login...");
    }
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Auth ──

export interface AdminLoginResponse {
  token: string;
  username: string;
}

export function adminLogin(username: string, password: string) {
  return adminRequest<AdminLoginResponse>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

// ── Admin Master Types ──

export interface AdminStatus {
  id: number;
  name: string;
  label: string;
  textColor: string;
  bgColor: string;
  chartColor: string;
  displayOrder: number;
  isActive: boolean;
}

export interface AdminSeverity {
  id: number;
  name: string;
  label: string;
  textColor: string;
  bgColor: string;
  displayOrder: number;
  isActive: boolean;
}

export interface AdminProcess {
  id: string;
  name: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
}

export interface AdminTask {
  id: string;
  name: string;
  processId: string;
  displayOrder: number;
  isActive: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  displayOrder: number;
  isActive: boolean;
}

export interface UserPermission {
  id: number;
  userId: string;
  userName: string;
  userEmail: string;
  canCreateIssue: boolean;
  canEditIssue: boolean;
  canResolveIssue: boolean;
  canBulkUpload: boolean;
  canAccessAdmin: boolean;
  isBlocked: boolean;
}

// ── Statuses ──

export function fetchAdminStatuses() {
  return adminRequest<AdminStatus[]>("/api/admin/statuses");
}

export function createStatus(data: Omit<AdminStatus, "id" | "isActive">) {
  return adminRequest<{ id: number }>("/api/admin/statuses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateStatus(id: number, data: Omit<AdminStatus, "id" | "isActive">) {
  return adminRequest<void>(`/api/admin/statuses/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function toggleStatusActive(id: number) {
  return adminRequest<void>(`/api/admin/statuses/${id}`, { method: "DELETE" });
}

// ── Severities ──

export function fetchAdminSeverities() {
  return adminRequest<AdminSeverity[]>("/api/admin/severities");
}

export function createSeverity(data: Omit<AdminSeverity, "id" | "isActive">) {
  return adminRequest<{ id: number }>("/api/admin/severities", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateSeverity(id: number, data: Omit<AdminSeverity, "id" | "isActive">) {
  return adminRequest<void>(`/api/admin/severities/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function toggleSeverityActive(id: number) {
  return adminRequest<void>(`/api/admin/severities/${id}`, { method: "DELETE" });
}

// ── Processes ──

export function fetchAdminProcesses() {
  return adminRequest<AdminProcess[]>("/api/admin/processes");
}

export function createProcess(data: Omit<AdminProcess, "isActive">) {
  return adminRequest<void>("/api/admin/processes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateProcess(id: string, data: Omit<AdminProcess, "id" | "isActive">) {
  return adminRequest<void>(`/api/admin/processes/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function toggleProcessActive(id: string) {
  return adminRequest<void>(`/api/admin/processes/${id}`, { method: "DELETE" });
}

// ── Tasks ──

export function fetchAdminTasks() {
  return adminRequest<AdminTask[]>("/api/admin/tasks");
}

export function createTask(data: Omit<AdminTask, "isActive">) {
  return adminRequest<void>("/api/admin/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTask(id: string, data: Omit<AdminTask, "id" | "isActive">) {
  return adminRequest<void>(`/api/admin/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function toggleTaskActive(id: string) {
  return adminRequest<void>(`/api/admin/tasks/${id}`, { method: "DELETE" });
}

// ── Users ──

export function fetchAdminUsers() {
  return adminRequest<AdminUser[]>("/api/admin/users");
}

export function createUser(data: Omit<AdminUser, "isActive">) {
  return adminRequest<void>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateUser(id: string, data: Omit<AdminUser, "id" | "isActive">) {
  return adminRequest<void>(`/api/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function toggleUserActive(id: string) {
  return adminRequest<void>(`/api/admin/users/${id}`, { method: "DELETE" });
}

// ── Employee Search (Intranet) ──

export interface IntranetEmployee {
  emp_ID: string;
  emp_Name: string;
  department: string | null;
  designation: string | null;
  company_Name: string | null;
  email: string | null;
}

export function searchIntranetEmployees(query: string) {
  return adminRequest<IntranetEmployee[]>(
    `/api/admin/employees/search?q=${encodeURIComponent(query)}`
  );
}

export function addIntranetEmployee(data: { id: string; name: string; email: string }) {
  return adminRequest<unknown>("/api/admin/employees/add", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Enter App (login as user from admin) ──

export interface EnterAppUserData {
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

export interface EnterAppResponse {
  user: EnterAppUserData;
  sessionToken: string;
}

export function enterAppAsUser(userId: string) {
  return adminRequest<EnterAppResponse>("/api/admin/enter-app", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

// ── Permissions ──

export function fetchAllPermissions() {
  return adminRequest<UserPermission[]>("/api/admin/permissions");
}

export function fetchUserPermissions(userId: string) {
  return adminRequest<UserPermission>(`/api/admin/permissions/${userId}`);
}

export function updateUserPermissions(
  userId: string,
  data: {
    canCreateIssue: boolean;
    canEditIssue: boolean;
    canResolveIssue: boolean;
    canBulkUpload: boolean;
    canAccessAdmin: boolean;
    isBlocked: boolean;
  }
) {
  return adminRequest<void>(`/api/admin/permissions/${userId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
