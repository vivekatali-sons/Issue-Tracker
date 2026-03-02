
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  type AdminTask, type AdminProcess,
  fetchAdminTasks, fetchAdminProcesses, createTask, updateTask, toggleTaskActive,
} from "@/lib/admin-api";
import { toast } from "sonner";

interface FormState { id: string; name: string; processId: string; displayOrder: number }

const EMPTY: FormState = { id: "", name: "", processId: "", displayOrder: 0 };

export default function AdminTasksPage() {
  const [items, setItems] = useState<AdminTask[]>([]);
  const [processes, setProcesses] = useState<AdminProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, p] = await Promise.all([fetchAdminTasks(), fetchAdminProcesses()]);
      setItems(t);
      setProcesses(p);
    } catch { toast.error("Failed to load tasks"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function getProcessName(pid: string) {
    return processes.find((p) => p.id === pid)?.name ?? pid;
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setDialogOpen(true);
  }

  function openEdit(item: AdminTask) {
    setEditingId(item.id);
    setForm({ id: item.id, name: item.name, processId: item.processId, displayOrder: item.displayOrder });
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editingId) {
        await updateTask(editingId, { name: form.name, processId: form.processId, displayOrder: form.displayOrder });
        toast.success("Task updated");
      } else {
        await createTask({ id: form.id, name: form.name, processId: form.processId, displayOrder: form.displayOrder });
        toast.success("Task created");
      }
      setDialogOpen(false);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally { setSaving(false); }
  }

  async function handleToggle(item: AdminTask) {
    try {
      await toggleTaskActive(item.id);
      toast.success(`Task ${item.isActive ? "deactivated" : "activated"}`);
      load();
    } catch { toast.error("Toggle failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tasks</h2>
        <Button onClick={openCreate}>Add Task</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Process</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className={!item.isActive ? "opacity-50" : ""}>
                <TableCell className="font-mono text-sm">{item.id}</TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{getProcessName(item.processId)}</TableCell>
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
            <DialogTitle>{editingId ? "Edit Task" : "Create Task"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>ID (unique key)</Label>
              <Input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="e.g. T20" disabled={!!editingId} />
            </div>
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Stock Reconciliation" />
            </div>
            <div className="grid gap-2">
              <Label>Process</Label>
              <Select value={form.processId} onValueChange={(v) => setForm({ ...form, processId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a process" />
                </SelectTrigger>
                <SelectContent>
                  {processes.filter((p) => p.isActive).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Display Order</Label>
              <Input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} />
            </div>
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
