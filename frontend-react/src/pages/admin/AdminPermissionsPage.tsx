
import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { type UserPermission, fetchAllPermissions, updateUserPermissions } from "@/lib/admin-api";
import { toast } from "sonner";

const PERMISSION_COLS = [
  { key: "canCreateIssue" as const, label: "Create" },
  { key: "canEditIssue" as const, label: "Edit" },
  { key: "canResolveIssue" as const, label: "Resolve" },
  { key: "canBulkUpload" as const, label: "Bulk Upload" },
  { key: "canAccessAdmin" as const, label: "Admin" },
  { key: "isBlocked" as const, label: "Blocked" },
];

type PermKey = (typeof PERMISSION_COLS)[number]["key"];

export default function AdminPermissionsPage() {
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPermissions(await fetchAllPermissions()); }
    catch { toast.error("Failed to load permissions"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(perm: UserPermission, key: PermKey) {
    const updated = { ...perm, [key]: !perm[key] };
    setSaving(perm.userId);
    try {
      await updateUserPermissions(perm.userId, {
        canCreateIssue: updated.canCreateIssue,
        canEditIssue: updated.canEditIssue,
        canResolveIssue: updated.canResolveIssue,
        canBulkUpload: updated.canBulkUpload,
        canAccessAdmin: updated.canAccessAdmin,
        isBlocked: updated.isBlocked,
      });
      setPermissions((prev) =>
        prev.map((p) => (p.userId === perm.userId ? { ...p, [key]: !p[key] } : p))
      );
      toast.success(`${perm.userName}: ${key} ${updated[key] ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to update permission");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">User Permissions</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Toggle individual permissions for each user. Changes are saved immediately.
      </p>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              {PERMISSION_COLS.map((col) => (
                <TableHead key={col.key} className="text-center">{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((perm) => (
              <TableRow key={perm.userId} className={perm.isBlocked ? "opacity-50 bg-destructive/5" : ""}>
                <TableCell className="font-medium">
                  {perm.userName}
                  {perm.isBlocked && (
                    <Badge variant="destructive" className="ml-2">Blocked</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{perm.userEmail}</TableCell>
                {PERMISSION_COLS.map((col) => (
                  <TableCell key={col.key} className="text-center">
                    <Checkbox
                      checked={perm[col.key]}
                      onCheckedChange={() => handleToggle(perm, col.key)}
                      disabled={saving === perm.userId}
                      className={col.key === "isBlocked" ? "border-destructive data-[state=checked]:bg-destructive" : ""}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
