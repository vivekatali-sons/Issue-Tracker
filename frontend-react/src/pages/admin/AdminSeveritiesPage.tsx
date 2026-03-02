
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { safeClass } from "@/lib/safe-class";

const EMPTY: Omit<AdminSeverity, "id" | "isActive"> = {
  name: "", label: "", textColor: "", bgColor: "", displayOrder: 0,
};

export default function AdminSeveritiesPage() {
  const [items, setItems] = useState<AdminSeverity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await fetchAdminSeverities()); }
    catch { toast.error("Failed to load severities"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setDialogOpen(true);
  }

  function openEdit(item: AdminSeverity) {
    setEditingId(item.id);
    setForm({ name: item.name, label: item.label, textColor: item.textColor, bgColor: item.bgColor, displayOrder: item.displayOrder });
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editingId) {
        await updateSeverity(editingId, form);
        toast.success("Severity updated");
      } else {
        await createSeverity(form);
        toast.success("Severity created");
      }
      setDialogOpen(false);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally { setSaving(false); }
  }

  async function handleToggle(item: AdminSeverity) {
    try {
      await toggleSeverityActive(item.id);
      toast.success(`Severity ${item.isActive ? "deactivated" : "activated"}`);
      load();
    } catch { toast.error("Toggle failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Severities</h2>
        <Button onClick={openCreate}>Add Severity</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Preview</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className={!item.isActive ? "opacity-50" : ""}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.label}</TableCell>
                <TableCell>
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${safeClass(item.textColor)} ${safeClass(item.bgColor)}`}>
                    {item.label}
                  </span>
                </TableCell>
                <TableCell>{item.displayOrder}</TableCell>
                <TableCell>
                  <Badge variant={item.isActive ? "default" : "secondary"}>
                    {item.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(item)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggle(item)}>
                    {item.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Severity" : "Create Severity"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Name (key)</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. high" />
            </div>
            <div className="grid gap-2">
              <Label>Label (display)</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. High" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Text Color (Tailwind class)</Label>
                <Input value={form.textColor} onChange={(e) => setForm({ ...form, textColor: e.target.value })} placeholder="e.g. text-red-700" />
              </div>
              <div className="grid gap-2">
                <Label>BG Color (Tailwind class)</Label>
                <Input value={form.bgColor} onChange={(e) => setForm({ ...form, bgColor: e.target.value })} placeholder="e.g. bg-red-100" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Display Order</Label>
              <Input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} />
            </div>
            {form.textColor && form.bgColor && (
              <div className="grid gap-2">
                <Label>Preview</Label>
                <div>
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${safeClass(form.textColor)} ${safeClass(form.bgColor)}`}>
                    {form.label || "Preview"}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
