
import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import * as api from "@/lib/api";
import type {
  ApiMasterStatus, ApiMasterSeverity, ApiMasterProcess,
  ApiMasterTask, ApiMasterUser,
} from "@/lib/api";

interface StatusConfig {
  label: string;
  textColor: string;
  bgColor: string;
  chartColor: string;
}

interface SeverityConfig {
  label: string;
  textColor: string;
  bgColor: string;
}

interface MasterDataContextValue {
  statuses: ApiMasterStatus[];
  severities: ApiMasterSeverity[];
  processes: ApiMasterProcess[];
  tasks: ApiMasterTask[];
  users: ApiMasterUser[];
  loading: boolean;
  refreshMasterData: () => Promise<void>;
  getUserName: (userId: string) => string;
  getProcessName: (processId: string) => string;
  getTaskName: (taskId: string) => string;
  getTasksForProcess: (processId: string) => ApiMasterTask[];
  getStatusConfig: (status: string) => StatusConfig;
  getSeverityConfig: (severity: string) => SeverityConfig;
  statusOrder: Record<string, number>;
  severityOrder: Record<string, number>;
}

const DEFAULT_STATUS_CONFIG: StatusConfig = {
  label: "Unknown", textColor: "text-gray-700", bgColor: "bg-gray-100", chartColor: "#6b7280",
};

const DEFAULT_SEVERITY_CONFIG: SeverityConfig = {
  label: "Unknown", textColor: "text-gray-700", bgColor: "bg-gray-100",
};

const MasterDataContext = createContext<MasterDataContextValue | null>(null);

export function MasterDataProvider({ children }: { children: ReactNode }) {
  const [statuses, setStatuses] = useState<ApiMasterStatus[]>([]);
  const [severities, setSeverities] = useState<ApiMasterSeverity[]>([]);
  const [processes, setProcesses] = useState<ApiMasterProcess[]>([]);
  const [tasks, setTasks] = useState<ApiMasterTask[]>([]);
  const [users, setUsers] = useState<ApiMasterUser[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshMasterData = useCallback(async () => {
    try {
      const data = await api.fetchMasterData();
      setStatuses(data.statuses);
      setSeverities(data.severities);
      setProcesses(data.processes);
      setTasks(data.tasks);
      setUsers(data.users);
    } catch (err) {
      console.error("Failed to fetch master data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshMasterData(); }, [refreshMasterData]);

  // Build lookup maps
  const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
  const processMap = useMemo(() => new Map(processes.map(p => [p.id, p])), [processes]);
  const taskMap = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks]);
  const statusMap = useMemo(() => new Map(statuses.map(s => [s.name, s])), [statuses]);
  const severityMap = useMemo(() => new Map(severities.map(s => [s.name, s])), [severities]);

  const getUserName = useCallback(
    (userId: string) => userMap.get(userId)?.name ?? userId,
    [userMap],
  );
  const getProcessName = useCallback(
    (processId: string) => processMap.get(processId)?.name ?? processId,
    [processMap],
  );
  const getTaskName = useCallback(
    (taskId: string) => taskMap.get(taskId)?.name ?? taskId,
    [taskMap],
  );
  const getTasksForProcess = useCallback(
    (processId: string) => tasks.filter(t => t.processId === processId),
    [tasks],
  );

  const getStatusConfig = useCallback((status: string): StatusConfig => {
    const s = statusMap.get(status);
    return s
      ? { label: s.label, textColor: s.textColor, bgColor: s.bgColor, chartColor: s.chartColor }
      : { ...DEFAULT_STATUS_CONFIG, label: status };
  }, [statusMap]);

  const getSeverityConfig = useCallback((severity: string): SeverityConfig => {
    const s = severityMap.get(severity);
    return s
      ? { label: s.label, textColor: s.textColor, bgColor: s.bgColor }
      : { ...DEFAULT_SEVERITY_CONFIG, label: severity };
  }, [severityMap]);

  const statusOrder = useMemo(
    () => Object.fromEntries(statuses.map(s => [s.name, s.displayOrder])),
    [statuses],
  );
  const severityOrder = useMemo(
    () => Object.fromEntries(severities.map(s => [s.name, s.displayOrder])),
    [severities],
  );

  const value = useMemo<MasterDataContextValue>(() => ({
    statuses, severities, processes, tasks, users, loading,
    refreshMasterData, getUserName, getProcessName, getTaskName,
    getTasksForProcess, getStatusConfig, getSeverityConfig,
    statusOrder, severityOrder,
  }), [
    statuses, severities, processes, tasks, users, loading,
    refreshMasterData, getUserName, getProcessName, getTaskName,
    getTasksForProcess, getStatusConfig, getSeverityConfig,
    statusOrder, severityOrder,
  ]);

  return (
    <MasterDataContext.Provider value={value}>
      {children}
    </MasterDataContext.Provider>
  );
}

export function useMasterData() {
  const context = useContext(MasterDataContext);
  if (!context) throw new Error("useMasterData must be used within <MasterDataProvider>");
  return context;
}
