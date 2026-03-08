import { useEffect, useState, useCallback, useMemo } from "react";
import {
  fetchAuditLogs,
  fetchAuditLogsByIssue,
  fetchDeletedIssues,
  restoreIssue,
  hardDeleteIssue,
  fetchAdminUsers,
  type AuditLogEntry,
  type DeletedIssue,
  type AdminUser,
} from "@/lib/admin-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  History,
  Trash2,
  RotateCcw,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  FileText,
  Plus,
  Pencil,
  CheckCircle2,
  RefreshCw,
  XCircle,
  Undo2,
  Eye,
  Users,
  Globe,
  Hash,
  Calendar,
  User,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm-dialog";

const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  Created: { label: "Created", icon: <Plus className="h-3.5 w-3.5" />, color: "text-emerald-500 bg-emerald-500/10" },
  Updated: { label: "Updated", icon: <Pencil className="h-3.5 w-3.5" />, color: "text-blue-500 bg-blue-500/10" },
  Deleted: { label: "Deleted", icon: <Trash2 className="h-3.5 w-3.5" />, color: "text-red-500 bg-red-500/10" },
  Resolved: { label: "Resolved", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-teal-500 bg-teal-500/10" },
  Reopened: { label: "Reopened", icon: <RefreshCw className="h-3.5 w-3.5" />, color: "text-amber-500 bg-amber-500/10" },
  Restored: { label: "Restored", icon: <Undo2 className="h-3.5 w-3.5" />, color: "text-violet-500 bg-violet-500/10" },
};

type TabType = "audit" | "recycle";

export default function AdminAuditPage() {
  const [tab, setTab] = useState<TabType>("audit");

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg bg-muted/50 dark:bg-white/5 p-1 w-fit border border-border/40">
        <TabButton active={tab === "audit"} onClick={() => setTab("audit")} icon={<History className="h-4 w-4" />} label="Audit Trail" />
        <TabButton active={tab === "recycle"} onClick={() => setTab("recycle")} icon={<Trash2 className="h-4 w-4" />} label="Recycle Bin" />
      </div>

      {tab === "audit" ? <AuditTrailTab /> : <RecycleBinTab />}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200",
        active
          ? "bg-background dark:bg-white/10 text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ════════════════════════════════════════════
// Audit Trail Tab
// ════════════════════════════════════════════

function AuditTrailTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterIssueId, setFilterIssueId] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const pageSize = 30;

  const userMap = useMemo(() => {
    const map = new Map<string, { name: string; email: string }>();
    for (const u of users) map.set(u.id, { name: u.name, email: u.email });
    return map;
  }, [users]);

  useEffect(() => {
    fetchAdminUsers().then(setUsers).catch(() => {});
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchAuditLogs({
        action: filterAction || undefined,
        userId: filterUser || undefined,
        entityId: filterIssueId ? Number(filterIssueId) : undefined,
        pageSize,
        page,
      });
      setLogs(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterUser, filterIssueId]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <AlertCircle className="h-8 w-8" />
        <p>Failed to load audit logs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Action</label>
          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
              className="h-9 rounded-lg border border-border/60 bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
            >
              <option value="">All Actions</option>
              {Object.keys(ACTION_CONFIG).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">User ID</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={filterUser}
              onChange={(e) => { setFilterUser(e.target.value); setPage(1); }}
              placeholder="e.g. 00123"
              className="h-9 w-32 rounded-lg border border-border/60 bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Issue #</label>
          <div className="relative">
            <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={filterIssueId}
              onChange={(e) => { setFilterIssueId(e.target.value.replace(/\D/g, "")); setPage(1); }}
              placeholder="e.g. 42"
              className="h-9 w-24 rounded-lg border border-border/60 bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30 dark:bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">When</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Issue</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">IP</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <AuditRow key={log.id} log={log} userMap={userMap} onViewDetails={setSelectedLog} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Page {page} {logs.length < pageSize && logs.length > 0 ? "(last page)" : ""}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 text-xs font-medium disabled:opacity-40 hover:bg-muted transition"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={logs.length < pageSize}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 text-xs font-medium disabled:opacity-40 hover:bg-muted transition"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      <AuditDetailModal log={selectedLog} userMap={userMap} onClose={() => setSelectedLog(null)} />
    </div>
  );
}

function AuditRow({ log, userMap, onViewDetails }: { log: AuditLogEntry; userMap: Map<string, { name: string; email: string }>; onViewDetails: (log: AuditLogEntry) => void }) {
  const config = ACTION_CONFIG[log.action] ?? { label: log.action, icon: <History className="h-3.5 w-3.5" />, color: "text-gray-500 bg-gray-500/10" };

  const ts = new Date(log.timestamp);
  const timeStr = ts.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });

  const user = userMap.get(log.userId);
  const userName = user ? user.name : log.userId;

  return (
    <tr className="border-b border-border/30 last:border-b-0 hover:bg-muted/30 dark:hover:bg-white/[0.02] transition">
      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{timeStr}</td>
      <td className="px-4 py-2.5">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", config.color)}>
          {config.icon}
          {config.label}
        </span>
      </td>
      <td className="px-4 py-2.5 text-xs font-mono">
        {log.entityId ? `#${log.entityId}` : "-"}
      </td>
      <td className="px-4 py-2.5 text-xs font-medium" title={user ? `${user.email} (${log.userId})` : log.userId}>
        {userName}
      </td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{log.ipAddress ?? "-"}</td>
      <td className="px-4 py-2.5 text-center">
        {log.details ? (
          <button
            onClick={() => onViewDetails(log)}
            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </td>
    </tr>
  );
}

function AuditDetailModal({ log, userMap, onClose }: { log: AuditLogEntry | null; userMap: Map<string, { name: string; email: string }>; onClose: () => void }) {
  if (!log) return <Dialog open={false} onOpenChange={() => {}} />;

  const config = ACTION_CONFIG[log.action] ?? { label: log.action, icon: <History className="h-3.5 w-3.5" />, color: "text-gray-500 bg-gray-500/10" };
  const ts = new Date(log.timestamp);
  const timeStr = ts.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const user = userMap.get(log.userId);

  let parsedDetails: { field: string; from: string | null; to: string | null }[] | null = null;
  let rawJson: Record<string, unknown> | null = null;
  if (log.details) {
    try {
      const parsed = JSON.parse(log.details);
      if (Array.isArray(parsed)) parsedDetails = parsed;
      else if (typeof parsed === "object") rawJson = parsed;
    } catch { /* show raw */ }
  }

  // Map for action → accent color class used in the header icon circle
  const ACTION_ACCENT: Record<string, string> = {
    Created: "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    Updated: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400",
    Deleted: "bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400",
    Resolved: "bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400",
    Reopened: "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400",
    Restored: "bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400",
  };
  const accentClass = ACTION_ACCENT[log.action] ?? "bg-muted text-muted-foreground";

  return (
    <Dialog open={!!log} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-md p-0">
        {/* ── Header ── */}
        <DialogHeader className="flex-shrink-0 border-b bg-muted/40 dark:bg-white/[0.03] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", accentClass)}>
              {config.icon}
            </div>
            <div>
              <DialogTitle className="text-base">
                {config.label}{log.entityId ? ` — Issue #${log.entityId}` : ""}
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                {timeStr}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid gap-4">
            {/* Meta cards — 2×2 grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/30 dark:bg-white/[0.02] px-3 py-2.5">
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">User</p>
                  <p className="text-xs font-medium truncate">{user ? user.name : log.userId}</p>
                  {user && <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/30 dark:bg-white/[0.02] px-3 py-2.5">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Entity</p>
                  <p className="text-xs font-medium truncate">{log.entityType}{log.entityId ? ` #${log.entityId}` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/30 dark:bg-white/[0.02] px-3 py-2.5">
                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">IP Address</p>
                  <p className="text-xs font-medium font-mono">{log.ipAddress ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/30 dark:bg-white/[0.02] px-3 py-2.5">
                <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">User ID</p>
                  <p className="text-xs font-medium font-mono">{log.userId}</p>
                </div>
              </div>
            </div>

            {/* Field changes table */}
            {parsedDetails && parsedDetails.length > 0 && (
              <div className="grid gap-2">
                <p className="text-xs font-semibold">Changes</p>
                <div className="rounded-lg border border-border/60 overflow-hidden">
                  {parsedDetails.map((change, i) => (
                    <div key={i} className={cn("grid grid-cols-[120px_1fr] text-xs", i > 0 && "border-t border-border/40")}>
                      <div className="bg-muted/30 dark:bg-white/[0.02] px-3 py-2 font-medium text-muted-foreground">{change.field}</div>
                      <div className="px-3 py-2 flex items-center gap-1.5 flex-wrap">
                        {change.from !== null && change.from !== undefined ? (
                          <>
                            <span className="inline-flex items-center rounded-md bg-red-500/10 px-1.5 py-0.5 text-red-500 dark:text-red-400 line-through">{change.from || <em className="no-underline">empty</em>}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-400">{change.to || <em>empty</em>}</span>
                          </>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">{change.to}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Snapshot (Created / Deleted JSON object) */}
            {!parsedDetails && rawJson && (
              <div className="grid gap-2">
                <p className="text-xs font-semibold">Snapshot</p>
                <div className="rounded-lg border border-border/60 overflow-hidden">
                  {Object.entries(rawJson).map(([key, value], i) => (
                    <div key={key} className={cn("grid grid-cols-[120px_1fr] text-xs", i > 0 && "border-t border-border/40")}>
                      <div className="bg-muted/30 dark:bg-white/[0.02] px-3 py-2 font-medium text-muted-foreground">{key}</div>
                      <div className="px-3 py-2 break-words">{String(value ?? "—")}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw text fallback */}
            {!parsedDetails && !rawJson && log.details && (
              <div className="grid gap-2">
                <p className="text-xs font-semibold">Details</p>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono rounded-lg border border-border/60 bg-muted/30 dark:bg-white/[0.02] p-3 max-h-48 overflow-auto">{log.details}</pre>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ════════════════════════════════════════════
// Recycle Bin Tab
// ════════════════════════════════════════════

function RecycleBinTab() {
  const confirmDialog = useConfirm();
  const [issues, setIssues] = useState<DeletedIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<DeletedIssue | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);

  const userMap = useMemo(() => {
    const map = new Map<string, { name: string; email: string }>();
    for (const u of users) map.set(u.id, { name: u.name, email: u.email });
    return map;
  }, [users]);

  useEffect(() => {
    fetchAdminUsers().then(setUsers).catch(() => {});
  }, []);

  const loadIssues = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setIssues(await fetchDeletedIssues());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadIssues(); }, [loadIssues]);

  const getUserName = (id: string) => userMap.get(id)?.name ?? id;

  async function handleRestore(id: number) {
    const ok = await confirmDialog({
      title: "Restore Issue",
      description: "Restore this issue? It will reappear in the issues list.",
      confirmLabel: "Restore",
    });
    if (!ok) return;
    setActionInProgress(id);
    try {
      await restoreIssue(id);
      setIssues((prev) => prev.filter((i) => i.id !== id));
      setSelectedIssue(null);
      toast.success("Issue restored successfully");
    } catch {
      toast.error("Failed to restore issue");
    } finally {
      setActionInProgress(null);
    }
  }

  async function handlePermanentDelete(id: number) {
    const ok = await confirmDialog({
      title: "Permanently Delete Issue",
      description: "This action CANNOT be undone. The issue and all its data will be permanently removed.",
      confirmLabel: "Delete Permanently",
      variant: "destructive",
    });
    if (!ok) return;
    setActionInProgress(id);
    try {
      await hardDeleteIssue(id);
      setIssues((prev) => prev.filter((i) => i.id !== id));
      setSelectedIssue(null);
      toast.success("Issue permanently deleted");
    } catch {
      toast.error("Failed to delete issue");
    } finally {
      setActionInProgress(null);
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <AlertCircle className="h-8 w-8" />
        <p>Failed to load deleted issues.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <Trash2 className="h-8 w-8 opacity-30" />
        <p className="text-sm">Recycle bin is empty.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border/50 overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30 dark:bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">ID</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Title</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Severity</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Deleted By</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Deleted At</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">View</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => {
                const delAt = new Date(issue.deletedAt);
                const delStr = delAt.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
                const isActioning = actionInProgress === issue.id;

                return (
                  <tr key={issue.id} className="border-b border-border/30 last:border-b-0 hover:bg-muted/30 dark:hover:bg-white/[0.02] transition">
                    <td className="px-4 py-2.5 text-xs font-mono">#{issue.id}</td>
                    <td className="px-4 py-2.5 text-xs font-medium max-w-[250px] truncate">{issue.issueTitle}</td>
                    <td className="px-4 py-2.5 text-xs">{issue.status}</td>
                    <td className="px-4 py-2.5 text-xs">{issue.severity}</td>
                    <td className="px-4 py-2.5 text-xs font-medium">{getUserName(issue.deletedBy ?? "-")}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{delStr}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => setSelectedIssue(issue)}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
                        title="View issue details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleRestore(issue.id)}
                          disabled={isActioning}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition disabled:opacity-50"
                        >
                          {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                          Restore
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(issue.id)}
                          disabled={isActioning}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 transition disabled:opacity-50"
                        >
                          {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deleted Issue Detail Modal */}
      <DeletedIssueDetailModal
        issue={selectedIssue}
        userMap={userMap}
        actionInProgress={actionInProgress}
        onRestore={handleRestore}
        onPermanentDelete={handlePermanentDelete}
        onClose={() => setSelectedIssue(null)}
      />
    </>
  );
}

function DeletedIssueDetailModal({
  issue,
  userMap,
  actionInProgress,
  onRestore,
  onPermanentDelete,
  onClose,
}: {
  issue: DeletedIssue | null;
  userMap: Map<string, { name: string; email: string }>;
  actionInProgress: number | null;
  onRestore: (id: number) => void;
  onPermanentDelete: (id: number) => void;
  onClose: () => void;
}) {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    if (!issue) return;
    setLogsLoading(true);
    fetchAuditLogsByIssue(issue.id)
      .then(setAuditLogs)
      .catch(() => setAuditLogs([]))
      .finally(() => setLogsLoading(false));
  }, [issue?.id]);

  if (!issue) return <Dialog open={false} onOpenChange={() => {}} />;

  const getUserName = (id: string) => userMap.get(id)?.name ?? id;
  const delStr = new Date(issue.deletedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  const createdStr = new Date(issue.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
  const isActioning = actionInProgress === issue.id;

  return (
    <Dialog open={!!issue} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg p-0">
        {/* ── Header ── */}
        <DialogHeader className="flex-shrink-0 border-b bg-muted/40 dark:bg-white/[0.03] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 dark:bg-red-500/20">
              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base truncate">
                Issue #{issue.id} — Deleted
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                Last state before deletion on {delStr}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid gap-4">
            {/* Title & Description */}
            <div className="grid gap-1.5">
              <p className="text-sm font-semibold leading-tight">{issue.issueTitle}</p>
              {issue.issueDescription && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{issue.issueDescription}</p>
              )}
            </div>

            {/* Status / Severity badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium">{issue.status}</span>
              <span className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                issue.severity === "Critical" ? "bg-red-500/10 text-red-600 dark:text-red-400" :
                issue.severity === "High" ? "bg-orange-500/10 text-orange-600 dark:text-orange-400" :
                issue.severity === "Medium" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                "bg-blue-500/10 text-blue-600 dark:text-blue-400"
              )}>{issue.severity}</span>
              {issue.reopenCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  <RefreshCw className="h-3 w-3" /> Reopened {issue.reopenCount}x
                </span>
              )}
            </div>

            {/* Meta cards — 2×2 grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/30 dark:bg-white/[0.02] px-3 py-2.5">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Raised By</p>
                  <p className="text-xs font-medium truncate">{getUserName(issue.issueRaisedBy)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/30 dark:bg-white/[0.02] px-3 py-2.5">
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Assigned To</p>
                  <p className="text-xs font-medium truncate">{getUserName(issue.assignedTo)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/30 dark:bg-white/[0.02] px-3 py-2.5">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Created</p>
                  <p className="text-xs font-medium">{createdStr}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/30 dark:bg-white/[0.02] px-3 py-2.5">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Deleted By</p>
                  <p className="text-xs font-medium truncate">{getUserName(issue.deletedBy ?? "-")}</p>
                </div>
              </div>
            </div>

            {issue.dueDate && (
              <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/30 dark:bg-white/[0.02] px-3 py-2.5">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Due Date</p>
                  <p className="text-xs font-medium">{new Date(issue.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}</p>
                </div>
              </div>
            )}

            {/* Audit Trail for this issue */}
            <div className="grid gap-2">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-muted-foreground" />
                Audit Trail
              </p>
              {logsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : auditLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No audit entries found.</p>
              ) : (
                <div className="rounded-lg border border-border/60 overflow-hidden">
                  {auditLogs.map((log, i) => {
                    const cfg = ACTION_CONFIG[log.action] ?? { label: log.action, icon: <History className="h-3 w-3" />, color: "text-gray-500 bg-gray-500/10" };
                    const logTime = new Date(log.timestamp).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
                    return (
                      <div key={log.id} className={cn("flex items-center gap-3 px-3 py-2 text-xs", i > 0 && "border-t border-border/40")}>
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0", cfg.color)}>
                          {cfg.icon}
                          {cfg.label}
                        </span>
                        <span className="text-muted-foreground truncate">{getUserName(log.userId)}</span>
                        <span className="ml-auto text-muted-foreground/70 whitespace-nowrap">{logTime}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer Actions ── */}
        <div className="flex-shrink-0 border-t px-6 py-4 flex items-center justify-end gap-2">
          <button
            onClick={() => onRestore(issue.id)}
            disabled={isActioning}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition disabled:opacity-50"
          >
            {isActioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Restore Issue
          </button>
          <button
            onClick={() => onPermanentDelete(issue.id)}
            disabled={isActioning}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 transition disabled:opacity-50"
          >
            {isActioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
            Delete Permanently
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
