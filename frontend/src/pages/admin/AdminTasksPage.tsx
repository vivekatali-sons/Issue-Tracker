
import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  type AdminTask, type AdminProcess,
  fetchAdminTasks, fetchAdminProcesses, createTask, updateTask, toggleTaskActive,
} from "@/lib/admin-api";
import { toast } from "sonner";
import { Download, Upload, Plus, Pencil, Ban, Power, Loader2 } from "lucide-react";
import { exportToCsv } from "@/lib/utils";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { BulkActionBar } from "@/components/admin/bulk-action-bar";
import { CsvImportDialog } from "@/components/admin/csv-import-dialog";

interface FormState { name: string; processId: string }
const EMPTY: FormState = { name: "", processId: "" };

export default function AdminTasksPage() {
  const [items, setItems] = useState<AdminTask[]>([]);
  const [processes, setProcesses] = useState<AdminProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const allIds = useMemo(() => items.map((i) => i.id), [items]);
  const bulk = useBulkSelection(allIds);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, p] = await Promise.all([fetchAdminTasks(), fetchAdminProcesses()]);
      setItems(t); setProcesses(p);
    } catch { toast.error("Failed to load tasks"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function getProcessName(pid: string) { return processes.find((p) => p.id === pid)?.name ?? pid; }
  function openCreate() { setEditingId(null); setForm(EMPTY); setDialogOpen(true); }

  function openEdit(item: AdminTask) {
    setEditingId(item.id);
    setForm({ name: item.name, processId: item.processId });
    setDialogOpen(true);
  }

  function isDuplicateTask(name: string, processId: string, excludeId?: string | null): boolean {
    return items.some(i => i.name.toLowerCase() === name.trim().toLowerCase() && i.processId === processId && i.id !== excludeId);
  }

  async function handleSave() {
    if (isDuplicateTask(form.name, form.processId, editingId)) {
      toast.error(`"${form.name.trim()}" already exists under this process`);
      return;
    }
    setSaving(true);
    try {
      if (editingId) { await updateTask(editingId, { name: form.name, processId: form.processId }); toast.success("Task updated"); }
      else { await createTask({ name: form.name, processId: form.processId }); toast.success("Task created"); }
      setDialogOpen(false); load();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Save failed"); }
    finally { setSaving(false); }
  }

  async function handleToggle(item: AdminTask) {
    try { await toggleTaskActive(item.id); toast.success(`Task ${item.isActive ? "deactivated" : "activated"}`); load(); }
    catch { toast.error("Toggle failed"); }
  }

  async function handleBulkToggle(activate: boolean) {
    const targets = items.filter((i) => bulk.selectedIds.has(i.id) && i.isActive !== activate);
    if (targets.length === 0) { toast.info("No changes needed"); return; }
    setBulkLoading(true);
    try {
      await Promise.all(targets.map((i) => toggleTaskActive(i.id)));
      toast.success(`${targets.length} task(s) ${activate ? "activated" : "deactivated"}`);
      bulk.clearSelection(); load();
    } catch { toast.error("Bulk operation failed"); }
    finally { setBulkLoading(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => {
          exportToCsv("tasks-export.csv", ["ID", "Name", "Process", "Status"],
            items.map((t) => [t.id, t.name, getProcessName(t.processId), t.isActive ? "Active" : "Inactive"]));
        }}>
          <Download className="mr-2 h-4 w-4" />Export
        </Button>
        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" />Import</Button>
        <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Task</Button>
      </div>

      <BulkActionBar count={bulk.count} onActivate={() => handleBulkToggle(true)} onDeactivate={() => handleBulkToggle(false)} onClear={bulk.clearSelection} loading={bulkLoading} />

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden dark:border-border/40 dark:shadow-black/20">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/60 bg-muted/30 hover:bg-muted/30 dark:bg-muted/10 dark:hover:bg-muted/10">
                  <TableHead className="w-10 pl-4"><Checkbox checked={bulk.allSelected} onCheckedChange={bulk.toggleAll} aria-label="Select all" /></TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ID</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Process</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className={`group border-b border-border/30 transition-colors duration-150 hover:bg-muted/40 dark:hover:bg-muted/20 ${!item.isActive ? "opacity-45" : ""}`}>
                    <TableCell className="pl-4"><Checkbox checked={bulk.selectedIds.has(item.id)} onCheckedChange={() => bulk.toggleOne(item.id)} aria-label={`Select ${item.name}`} /></TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.id}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{getProcessName(item.processId)}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${item.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>{item.isActive ? "Active" : "Inactive"}</span>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-accent" onClick={() => openEdit(item)} title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                        <button className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${item.isActive ? "hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400" : "hover:bg-emerald-500/10 hover:text-emerald-500 dark:hover:text-emerald-400"}`} onClick={() => handleToggle(item)} title={item.isActive ? "Deactivate" : "Activate"}>
                          {item.isActive ? <Ban className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit Task" : "Create Task"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Stock Reconciliation" /></div>
            <div className="grid gap-2">
              <Label>Process</Label>
              <Select value={form.processId} onValueChange={(v) => setForm({ ...form, processId: v })}>
                <SelectTrigger><SelectValue placeholder="Select a process" /></SelectTrigger>
                <SelectContent>{processes.filter((p) => p.isActive).map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} title="Tasks"
        requiredColumns={["Name", "ProcessId"]}
        sampleData={[["Stock Reconciliation", "P01"], ["Invoice Approval", "P02"], ["Leave Request", "P03"]]}
        validateRow={(row) => {
          const name = row["name"] ?? "";
          const pid = row["processid"] ?? "";
          if (name.length < 2) return `Name must be at least 2 characters`;
          if (pid.length < 2) return `ProcessId must be a valid ID (e.g. p1)`;
          if (!processes.some(p => p.id === pid)) return `Process "${pid}" not found`;
          if (isDuplicateTask(name, pid)) return `"${name}" already exists under process "${pid}"`;
          return null;
        }}
        createItem={async (row) => { await createTask({ name: row["name"] ?? "", processId: row["processid"] ?? "" }); }}
        onComplete={load}
      />
    </div>
  );
}
