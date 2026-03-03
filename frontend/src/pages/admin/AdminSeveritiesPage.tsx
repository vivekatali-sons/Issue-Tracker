
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
  type AdminSeverity,
  fetchAdminSeverities, createSeverity, updateSeverity, toggleSeverityActive,
} from "@/lib/admin-api";
import { toast } from "sonner";
import { Download, Upload, Plus, Pencil, Ban, Power, Loader2 } from "lucide-react";
import { exportToCsv } from "@/lib/utils";
import { safeClass } from "@/lib/safe-class";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { BulkActionBar } from "@/components/admin/bulk-action-bar";
import { CsvImportDialog } from "@/components/admin/csv-import-dialog";

const EMPTY: Omit<AdminSeverity, "id" | "isActive"> = {
  name: "", label: "", textColor: "", bgColor: "", displayOrder: 0,
};

// Auto-assign colors from a rotating palette when creating new items
const COLOR_PALETTE = [
  { textColor: "text-red-700", bgColor: "bg-red-100" },
  { textColor: "text-orange-700", bgColor: "bg-orange-100" },
  { textColor: "text-amber-700", bgColor: "bg-amber-100" },
  { textColor: "text-yellow-700", bgColor: "bg-yellow-100" },
  { textColor: "text-green-700", bgColor: "bg-green-100" },
  { textColor: "text-teal-700", bgColor: "bg-teal-100" },
  { textColor: "text-blue-700", bgColor: "bg-blue-100" },
  { textColor: "text-indigo-700", bgColor: "bg-indigo-100" },
  { textColor: "text-purple-700", bgColor: "bg-purple-100" },
  { textColor: "text-pink-700", bgColor: "bg-pink-100" },
  { textColor: "text-slate-700", bgColor: "bg-slate-100" },
];

export default function AdminSeveritiesPage() {
  const [items, setItems] = useState<AdminSeverity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const allIds = useMemo(() => items.map((i) => i.id), [items]);
  const bulk = useBulkSelection(allIds);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await fetchAdminSeverities()); }
    catch { toast.error("Failed to load severities"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditingId(null); setForm(EMPTY); setDialogOpen(true); }

  function openEdit(item: AdminSeverity) {
    setEditingId(item.id);
    setForm({ name: item.name, label: item.label, textColor: item.textColor, bgColor: item.bgColor, displayOrder: item.displayOrder });
    setDialogOpen(true);
  }

  function isDuplicateName(name: string, excludeId?: number | null): boolean {
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
        await updateSeverity(editingId, form);
        toast.success("Severity updated");
      } else {
        // Auto-assign colors and display order for new items
        const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.displayOrder)) + 1 : 0;
        const colorIdx = items.filter(i => i.isActive).length % COLOR_PALETTE.length;
        const colors = COLOR_PALETTE[colorIdx];
        await createSeverity({
          name: form.name,
          label: form.name, // Label = Name by default
          textColor: colors.textColor,
          bgColor: colors.bgColor,
          displayOrder: nextOrder,
        });
        toast.success("Severity created");
      }
      setDialogOpen(false); load();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Save failed"); }
    finally { setSaving(false); }
  }

  async function handleToggle(item: AdminSeverity) {
    try { await toggleSeverityActive(item.id); toast.success(`Severity ${item.isActive ? "deactivated" : "activated"}`); load(); }
    catch { toast.error("Toggle failed"); }
  }

  async function handleBulkToggle(activate: boolean) {
    const targets = items.filter((i) => bulk.selectedIds.has(i.id) && i.isActive !== activate);
    if (targets.length === 0) { toast.info("No changes needed"); return; }
    setBulkLoading(true);
    try {
      await Promise.all(targets.map((i) => toggleSeverityActive(i.id)));
      toast.success(`${targets.length} severity(ies) ${activate ? "activated" : "deactivated"}`);
      bulk.clearSelection(); load();
    } catch { toast.error("Bulk operation failed"); }
    finally { setBulkLoading(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => {
          exportToCsv("severities-export.csv", ["Name", "Label", "Text Color", "BG Color", "Display Order", "Status"],
            items.map((s) => [s.name, s.label, s.textColor, s.bgColor, String(s.displayOrder), s.isActive ? "Active" : "Inactive"]));
        }}>
          <Download className="mr-2 h-4 w-4" />Export
        </Button>
        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" />Import</Button>
        <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Severity</Button>
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
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold uppercase tracking-wider text-muted-foreground">Label</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className={`group border-b border-border/30 transition-colors duration-150 hover:bg-muted/40 dark:hover:bg-muted/20 ${!item.isActive ? "opacity-45" : ""}`}>
                    <TableCell className="pl-4"><Checkbox checked={bulk.selectedIds.has(item.id)} onCheckedChange={() => bulk.toggleOne(item.id)} aria-label={`Select ${item.name}`} /></TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{item.label}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${safeClass(item.textColor)} ${safeClass(item.bgColor)}`}>{item.label}</span>
                    </TableCell>
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
          <DialogHeader><DialogTitle>{editingId ? "Edit Severity" : "Add Severity"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Critical, High, Medium..." /></div>
            {editingId && (
              <>
                <div className="grid gap-2"><Label>Label</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Display label" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label>Text Color</Label><Input value={form.textColor} onChange={(e) => setForm({ ...form, textColor: e.target.value })} placeholder="text-red-700" /></div>
                  <div className="grid gap-2"><Label>BG Color</Label><Input value={form.bgColor} onChange={(e) => setForm({ ...form, bgColor: e.target.value })} placeholder="bg-red-100" /></div>
                </div>
                <div className="grid gap-2"><Label>Display Order</Label><Input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} /></div>
                {form.textColor && form.bgColor && (
                  <div className="grid gap-2"><Label>Preview</Label><div><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${safeClass(form.textColor)} ${safeClass(form.bgColor)}`}>{form.label || "Preview"}</span></div></div>
                )}
              </>
            )}
            {!editingId && (
              <p className="text-xs text-muted-foreground">Colors and display order will be assigned automatically. You can customize them later via Edit.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} title="Severities"
        requiredColumns={["Name"]}
        sampleData={[["Critical"], ["High"], ["Medium"], ["Low"]]}
        validateRow={(row) => {
          const name = row["name"] ?? "";
          if (isDuplicateName(name)) return `"${name}" already exists`;
          return null;
        }}
        createItem={async (row) => {
          const name = row["name"] ?? "";
          const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.displayOrder)) + 1 : 0;
          const colorIdx = items.filter(i => i.isActive).length % COLOR_PALETTE.length;
          const colors = COLOR_PALETTE[colorIdx];
          await createSeverity({ name, label: name, textColor: colors.textColor, bgColor: colors.bgColor, displayOrder: nextOrder });
        }}
        onComplete={load}
      />
    </div>
  );
}
