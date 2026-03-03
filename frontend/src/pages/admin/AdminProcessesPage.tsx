
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
  type AdminProcess,
  fetchAdminProcesses, createProcess, updateProcess, toggleProcessActive,
} from "@/lib/admin-api";
import { toast } from "sonner";
import { Download, Upload, Plus, Pencil, Ban, Power, Loader2 } from "lucide-react";
import { exportToCsv } from "@/lib/utils";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { BulkActionBar } from "@/components/admin/bulk-action-bar";
import { CsvImportDialog } from "@/components/admin/csv-import-dialog";

interface FormState { id: string; name: string; description: string; displayOrder: number }
const EMPTY: FormState = { id: "", name: "", description: "", displayOrder: 0 };

export default function AdminProcessesPage() {
  const [items, setItems] = useState<AdminProcess[]>([]);
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
    try { setItems(await fetchAdminProcesses()); }
    catch { toast.error("Failed to load processes"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditingId(null); setForm(EMPTY); setDialogOpen(true); }

  function openEdit(item: AdminProcess) {
    setEditingId(item.id);
    setForm({ id: item.id, name: item.name, description: item.description, displayOrder: item.displayOrder });
    setDialogOpen(true);
  }

  function generateId(name: string): string {
    // Auto-generate ID from name: "HR Module" -> "p-hr-module", ensuring uniqueness
    const base = "p-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "").slice(0, 8);
    const existingIds = new Set(items.map(i => i.id));
    if (!existingIds.has(base)) return base;
    for (let i = 2; i <= 99; i++) { const id = `${base}${i}`; if (!existingIds.has(id)) return id; }
    return base + Date.now();
  }

  function isDuplicateName(name: string, excludeId?: string | null): boolean {
    return items.some(i => i.name.toLowerCase() === name.trim().toLowerCase() && i.id !== excludeId);
  }

  async function handleSave() {
    if (isDuplicateName(form.name, editingId)) {
      toast.error(`"${form.name.trim()}" already exists`);
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateProcess(editingId, { name: form.name, description: form.description, displayOrder: form.displayOrder });
        toast.success("Process updated");
      } else {
        const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.displayOrder)) + 1 : 0;
        const autoId = form.id.trim() || generateId(form.name);
        await createProcess({ id: autoId, name: form.name, description: form.description || form.name, displayOrder: nextOrder });
        toast.success("Process created");
      }
      setDialogOpen(false); load();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Save failed"); }
    finally { setSaving(false); }
  }

  async function handleToggle(item: AdminProcess) {
    try { await toggleProcessActive(item.id); toast.success(`Process ${item.isActive ? "deactivated" : "activated"}`); load(); }
    catch { toast.error("Toggle failed"); }
  }

  async function handleBulkToggle(activate: boolean) {
    const targets = items.filter((i) => bulk.selectedIds.has(i.id) && i.isActive !== activate);
    if (targets.length === 0) { toast.info("No changes needed"); return; }
    setBulkLoading(true);
    try {
      await Promise.all(targets.map((i) => toggleProcessActive(i.id)));
      toast.success(`${targets.length} process(es) ${activate ? "activated" : "deactivated"}`);
      bulk.clearSelection(); load();
    } catch { toast.error("Bulk operation failed"); }
    finally { setBulkLoading(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => {
          exportToCsv("processes-export.csv", ["ID", "Name", "Description", "Display Order", "Status"],
            items.map((p) => [p.id, p.name, p.description, String(p.displayOrder), p.isActive ? "Active" : "Inactive"]));
        }}>
          <Download className="mr-2 h-4 w-4" />Export
        </Button>
        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" />Import</Button>
        <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Process</Button>
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
                  <TableHead className="hidden sm:table-cell text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order</TableHead>
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
                    <TableCell className="hidden sm:table-cell max-w-xs truncate text-muted-foreground">{item.description}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">{item.displayOrder}</TableCell>
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
          <DialogHeader><DialogTitle>{editingId ? "Edit Process" : "Add Process"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sales Module, HR Module..." /></div>
            {editingId && (
              <>
                <div className="grid gap-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Process description" /></div>
                <div className="grid gap-2"><Label>Display Order</Label><Input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} /></div>
              </>
            )}
            {!editingId && (
              <p className="text-xs text-muted-foreground">ID and display order will be assigned automatically. You can customize them later via Edit.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} title="Processes"
        requiredColumns={["Name"]}
        sampleData={[["Sales Module"], ["Finance Module"], ["HR Module"]]}
        validateRow={(row) => {
          const name = row["name"] ?? "";
          if (isDuplicateName(name)) return `"${name}" already exists`;
          return null;
        }}
        createItem={async (row) => {
          const name = row["name"] ?? "";
          const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.displayOrder)) + 1 : 0;
          const autoId = generateId(name);
          await createProcess({ id: autoId, name, description: name, displayOrder: nextOrder });
        }}
        onComplete={load}
      />
    </div>
  );
}
