
import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  type AdminUser, type UserPermission,
  fetchAdminUsers, createUser, updateUser, toggleUserActive,
  fetchUserPermissions, updateUserPermissions,
  type IntranetEmployee, searchIntranetEmployees, addIntranetEmployee,
  enterAppAsUser,
} from "@/lib/admin-api";
import { toast } from "sonner";
import { Search, UserPlus, Loader2, CheckCircle2, LogIn, Download, Pencil, ChevronLeft, ChevronRight, Calendar, Clock, FileText } from "lucide-react";
import { exportToCsv } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";

interface FormState {
  id: string;
  name: string;
  email: string;
}

interface PermState {
  canCreateIssue: boolean;
  canEditIssue: boolean;
  canResolveIssue: boolean;
  canBulkUpload: boolean;
  canAccessAdmin: boolean;
  isBlocked: boolean;
}

const EMPTY_FORM: FormState = { id: "", name: "", email: "" };
const DEFAULT_PERMS: PermState = {
  canCreateIssue: true, canEditIssue: false, canResolveIssue: false,
  canBulkUpload: false, canAccessAdmin: false, isBlocked: false,
};

const PERM_FIELDS: { key: keyof PermState; label: string; description: string; destructive?: boolean }[] = [
  { key: "canCreateIssue", label: "Create Issues", description: "Can raise new issues" },
  { key: "canEditIssue", label: "Edit Issues", description: "Can modify existing issues" },
  { key: "canResolveIssue", label: "Resolve Issues", description: "Can mark issues as resolved" },
  { key: "canBulkUpload", label: "Bulk Upload", description: "Can upload issues via CSV" },
  { key: "canAccessAdmin", label: "Admin Access", description: "Can access the admin portal" },
  { key: "isBlocked", label: "Block User", description: "User cannot access the app", destructive: true },
];

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [perms, setPerms] = useState<PermState>(DEFAULT_PERMS);
  const [permsLoading, setPermsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Table search & pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const filtered = useMemo(() => {
    if (!searchTerm) return items;
    const q = searchTerm.toLowerCase();
    return items.filter((u) =>
      u.id.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  }, [items, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset to page 1 when search changes
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  // Intranet search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<IntranetEmployee[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await fetchAdminUsers()); }
    catch { toast.error("Failed to load users"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Debounced Intranet employee search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        setSearchResults(await searchIntranetEmployees(searchQuery));
      } catch {
        toast.error("Employee search failed");
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPerms(DEFAULT_PERMS);
    setDialogOpen(true);
  }

  async function openEdit(item: AdminUser) {
    setEditingId(item.id);
    setForm({ id: item.id, name: item.name, email: item.email });
    setPerms(DEFAULT_PERMS);
    setDialogOpen(true);
    // Load permissions for this user
    setPermsLoading(true);
    try {
      const p = await fetchUserPermissions(item.id);
      setPerms({
        canCreateIssue: p.canCreateIssue,
        canEditIssue: p.canEditIssue,
        canResolveIssue: p.canResolveIssue,
        canBulkUpload: p.canBulkUpload,
        canAccessAdmin: p.canAccessAdmin,
        isBlocked: p.isBlocked,
      });
    } catch {
      // Permissions might not exist yet — keep defaults
    } finally {
      setPermsLoading(false);
    }
  }

  function openSearch() {
    setSearchQuery("");
    setSearchResults([]);
    setAddedIds(new Set());
    setSearchOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editingId) {
        await updateUser(editingId, { name: form.name, email: form.email });
        await updateUserPermissions(editingId, perms);
        toast.success("User updated");
      } else {
        await createUser({ id: form.id, name: form.name, email: form.email });
        // Set permissions for new user
        await updateUserPermissions(form.id, perms);
        toast.success("User created");
      }
      setDialogOpen(false);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally { setSaving(false); }
  }

  async function handleToggle(item: AdminUser) {
    try {
      await toggleUserActive(item.id);
      toast.success(`User ${item.isActive ? "deactivated" : "activated"}`);
      load();
    } catch { toast.error("Toggle failed"); }
  }

  async function handleAddFromIntranet(emp: IntranetEmployee) {
    setAdding(emp.emp_ID);
    try {
      await addIntranetEmployee({
        id: emp.emp_ID,
        name: emp.emp_Name,
        email: emp.email || "",
      });
      toast.success(`${emp.emp_Name} added successfully`);
      setAddedIds((prev) => new Set(prev).add(emp.emp_ID));
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add employee");
    } finally {
      setAdding(null);
    }
  }

  async function handleLoginAs(item: AdminUser) {
    try {
      const res = await enterAppAsUser(item.id);
      const u = res.user;
      const initials = u.name
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      const authUser = {
        id: u.id, name: u.name, email: u.email, initials,
        permissions: {
          canCreateIssue: u.canCreateIssue, canEditIssue: u.canEditIssue,
          canResolveIssue: u.canResolveIssue, canBulkUpload: u.canBulkUpload,
          canAccessAdmin: u.canAccessAdmin,
        },
      };
      sessionStorage.setItem("auth_user", JSON.stringify(authUser));
      sessionStorage.setItem("session_token", res.sessionToken);
      window.open("/dashboard", "_blank");
      toast.success(`Opened app as ${u.name}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to login as user");
    }
  }

  const existingIds = new Set(items.map((u) => u.id));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search bar */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 h-9"
            placeholder="Search by name, email or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => {
            const headers = ["Emp ID", "Name", "Email", "Status"];
            const rows = items.map((u) => [u.id, u.name, u.email, u.isActive ? "Active" : "Inactive"]);
            exportToCsv("users-export.csv", headers, rows);
          }}>
            <Download className="mr-2 h-4 w-4" />Export
          </Button>
          <Button variant="outline" size="sm" onClick={openSearch}>
            <Search className="mr-2 h-4 w-4" />
            Add from Intranet
          </Button>
          <Button size="sm" onClick={openCreate}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden dark:border-border/40 dark:shadow-black/20">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/60 bg-muted/30 hover:bg-muted/30 dark:bg-muted/10 dark:hover:bg-muted/10">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Emp ID</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((item) => (
                  <TableRow key={item.id} className={`group border-b border-border/30 transition-colors duration-150 hover:bg-muted/40 dark:hover:bg-muted/20 ${!item.isActive ? "opacity-45" : ""}`}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground sm:hidden">{item.email}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{item.email}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${item.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-accent" onClick={() => openEdit(item)} title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Edit user & permissions</TooltipContent>
                        </Tooltip>
                        {item.isActive && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground" onClick={() => handleLoginAs(item)} title={`Login as ${item.name}`}>
                                <LogIn className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Login as {item.name}</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      {searchTerm ? "No users match your search." : "No users found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between border-t border-border/40 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} user{filtered.length !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-1">
                <button
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("ellipsis");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === "ellipsis" ? (
                      <span key={`e${idx}`} className="px-1 text-xs text-muted-foreground">...</span>
                    ) : (
                      <button
                        key={p}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                          currentPage === p
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit / Create User Dialog — includes permissions */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg p-0">
          {/* ── Fixed Header ── */}
          <DialogHeader className="flex-shrink-0 border-b bg-muted/40 dark:bg-white/[0.03] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
                <Pencil className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base">{editingId ? `Edit User` : "Create User"}</DialogTitle>
                <DialogDescription className="mt-0.5">
                  {editingId ? form.name : "Fill in details and set permissions."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* ── Scrollable Body ── */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid gap-4">
              {/* User Info Section */}
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Emp ID</Label>
                  <Input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="e.g. 0188643" disabled={!!editingId} className="h-9" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. John Doe" className="h-9" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="e.g. john@company.com" type="email" className="h-9" />
                </div>
              </div>

              <Separator />

              {/* Permissions Section — 2-column grid */}
              <div className="grid gap-3">
                <Label className="text-sm font-semibold">Permissions</Label>
                {permsLoading ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading permissions...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {PERM_FIELDS.map((field) => (
                      <label
                        key={field.key}
                        className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/50 ${
                          field.destructive && perms[field.key] ? "border-destructive/50 bg-destructive/5" : ""
                        }`}
                      >
                        <Checkbox
                          checked={perms[field.key]}
                          onCheckedChange={(checked) => setPerms({ ...perms, [field.key]: !!checked })}
                          className={`mt-0.5 ${field.destructive ? "border-destructive data-[state=checked]:bg-destructive" : ""}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium leading-tight">{field.label}</div>
                          <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{field.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Activate / Deactivate + Audit for existing users */}
              {editingId && (() => {
                const editUser = items.find((u) => u.id === editingId);
                return (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Account Status</p>
                        <p className="text-xs text-muted-foreground">
                          {editUser?.isActive
                            ? "This user is currently active."
                            : "This user is currently inactive."}
                        </p>
                      </div>
                      <Button
                        variant={editUser?.isActive ? "destructive" : "default"}
                        size="sm"
                        onClick={() => {
                          if (editUser) {
                            handleToggle(editUser);
                            setDialogOpen(false);
                          }
                        }}
                      >
                        {editUser?.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </div>

                    <Separator />

                    {/* Audit Info */}
                    <div className="grid gap-2">
                      <Label className="text-sm font-semibold">Audit Info</Label>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Created</p>
                            <p className="text-xs font-medium truncate">
                              {editUser?.createdAt
                                ? format(new Date(editUser.createdAt), "dd MMM yyyy")
                                : "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Last Login</p>
                            <p className="text-xs font-medium truncate">
                              {editUser?.lastLoginAt
                                ? formatDistanceToNow(new Date(editUser.lastLoginAt), { addSuffix: true })
                                : "Never"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Issues</p>
                            <p className="text-xs font-medium">{editUser?.issuesRaised ?? 0}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* ── Fixed Footer ── */}
          <DialogFooter className="flex-shrink-0 border-t px-6 py-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Intranet Employee Search Dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Search Intranet Employees</DialogTitle>
            <DialogDescription>
              Search by employee ID or name to add them to the DMS portal.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 overflow-hidden">
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by name or employee ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
              {searching && (
                <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </div>
              )}

              {!searching && searchQuery.length < 2 && (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search.
                </p>
              )}

              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No employees found.
                </p>
              )}

              {!searching && searchResults.length > 0 && (
                <div className="divide-y">
                  {searchResults.map((emp) => {
                    const alreadyExists = existingIds.has(emp.emp_ID);
                    const justAdded = addedIds.has(emp.emp_ID);

                    return (
                      <div
                        key={emp.emp_ID}
                        className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-tight truncate">
                            {emp.emp_Name}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground truncate">
                            {emp.emp_ID}
                            {emp.department ? ` · ${emp.department}` : ""}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {alreadyExists || justAdded ? (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <CheckCircle2 className="h-3 w-3" />
                              Added
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={adding === emp.emp_ID}
                              onClick={() => handleAddFromIntranet(emp)}
                              className="h-8 px-3"
                            >
                              {adding === emp.emp_ID ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                "Add"
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {!searching && searchResults.length > 0 && (
              <p className="flex-shrink-0 text-center text-xs text-muted-foreground">
                Showing {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
