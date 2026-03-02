
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  type AdminUser,
  fetchAdminUsers, createUser, updateUser, toggleUserActive,
  type IntranetEmployee, searchIntranetEmployees, addIntranetEmployee,
  enterAppAsUser,
} from "@/lib/admin-api";
import { toast } from "sonner";
import { Search, UserPlus, Loader2, CheckCircle2, LogIn } from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";

interface FormState { id: string; name: string; email: string; displayOrder: number }

const EMPTY: FormState = { id: "", name: "", email: "", displayOrder: 0 };

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

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
        const results = await searchIntranetEmployees(searchQuery);
        setSearchResults(results);
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
    setForm(EMPTY);
    setDialogOpen(true);
  }

  function openEdit(item: AdminUser) {
    setEditingId(item.id);
    setForm({ id: item.id, name: item.name, email: item.email, displayOrder: item.displayOrder });
    setDialogOpen(true);
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
        await updateUser(editingId, { name: form.name, email: form.email, displayOrder: form.displayOrder });
        toast.success("User updated");
      } else {
        await createUser({ id: form.id, name: form.name, email: form.email, displayOrder: form.displayOrder });
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
      // Build the same AuthUser shape the main auth hook stores
      const initials = u.name
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      const authUser = {
        id: u.id,
        name: u.name,
        email: u.email,
        initials,
        permissions: {
          canCreateIssue: u.canCreateIssue,
          canEditIssue: u.canEditIssue,
          canResolveIssue: u.canResolveIssue,
          canBulkUpload: u.canBulkUpload,
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

  // IDs already in the users table
  const existingIds = new Set(items.map((u) => u.id));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Users</h2>
        <div className="flex flex-wrap gap-2">
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
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead className="w-[70px] text-center">Order</TableHead>
                <TableHead className="w-[80px] text-center">Status</TableHead>
                <TableHead className="w-[200px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className={!item.isActive ? "opacity-50" : ""}>
                  <TableCell className="font-mono text-xs">{item.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground sm:hidden">{item.email}</div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{item.email}</TableCell>
                  <TableCell className="text-center">{item.displayOrder}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={item.isActive ? "default" : "secondary"}>
                      {item.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {item.isActive && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleLoginAs(item)}>
                              <LogIn className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Login as {item.name}</TooltipContent>
                        </Tooltip>
                      )}
                      <Button variant="outline" size="sm" onClick={() => openEdit(item)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggle(item)}>
                        {item.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit User" : "Create User"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update user details below." : "Fill in the details to create a new user."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>ID (unique key)</Label>
              <Input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="e.g. u9" disabled={!!editingId} />
            </div>
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. John Doe" />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="e.g. john@company.com" type="email" />
            </div>
            <div className="grid gap-2">
              <Label>Display Order</Label>
              <Input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
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
            {/* Search input */}
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

            {/* Results area */}
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

            {/* Result count */}
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
