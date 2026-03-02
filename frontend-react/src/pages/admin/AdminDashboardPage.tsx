
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchAdminStatuses,
  fetchAdminSeverities,
  fetchAdminProcesses,
  fetchAdminTasks,
  fetchAdminUsers,
  fetchAllPermissions,
} from "@/lib/admin-api";

interface Counts {
  statuses: number;
  severities: number;
  processes: number;
  tasks: number;
  users: number;
  blockedUsers: number;
}

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    async function load() {
      const [statuses, severities, processes, tasks, users, permissions] = await Promise.all([
        fetchAdminStatuses(),
        fetchAdminSeverities(),
        fetchAdminProcesses(),
        fetchAdminTasks(),
        fetchAdminUsers(),
        fetchAllPermissions(),
      ]);
      setCounts({
        statuses: statuses.length,
        severities: severities.length,
        processes: processes.length,
        tasks: tasks.length,
        users: users.length,
        blockedUsers: permissions.filter((p) => p.isBlocked).length,
      });
    }
    load();
  }, []);

  const cards = counts
    ? [
        { title: "Statuses", value: counts.statuses },
        { title: "Severities", value: counts.severities },
        { title: "Processes", value: counts.processes },
        { title: "Tasks", value: counts.tasks },
        { title: "Users", value: counts.users },
        { title: "Blocked Users", value: counts.blockedUsers },
      ]
    : null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      {!cards ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Card key={c.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {c.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
