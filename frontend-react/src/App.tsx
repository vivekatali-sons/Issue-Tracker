import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { AdminLayout } from "@/layouts/AdminLayout";

import DashboardPage from "@/pages/DashboardPage";
import IssuesPage from "@/pages/IssuesPage";
import NewIssuePage from "@/pages/NewIssuePage";
import IssueDetailPage from "@/pages/IssueDetailPage";
import OpenIssuesPage from "@/pages/OpenIssuesPage";
import ResolvedPage from "@/pages/ResolvedPage";

import AdminLoginPage from "@/pages/admin/AdminLoginPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminStatusesPage from "@/pages/admin/AdminStatusesPage";
import AdminSeveritiesPage from "@/pages/admin/AdminSeveritiesPage";
import AdminProcessesPage from "@/pages/admin/AdminProcessesPage";
import AdminTasksPage from "@/pages/admin/AdminTasksPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminPermissionsPage from "@/pages/admin/AdminPermissionsPage";

export function App() {
  return (
    <Routes>
      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Main app routes — with sidebar + header */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/issues" element={<IssuesPage />} />
        <Route path="/issues/new" element={<NewIssuePage />} />
        <Route path="/issues/detail" element={<IssueDetailPage />} />
        <Route path="/open-issues" element={<OpenIssuesPage />} />
        <Route path="/resolved" element={<ResolvedPage />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/statuses" element={<AdminStatusesPage />} />
        <Route path="/admin/severities" element={<AdminSeveritiesPage />} />
        <Route path="/admin/processes" element={<AdminProcessesPage />} />
        <Route path="/admin/tasks" element={<AdminTasksPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/permissions" element={<AdminPermissionsPage />} />
      </Route>
    </Routes>
  );
}
