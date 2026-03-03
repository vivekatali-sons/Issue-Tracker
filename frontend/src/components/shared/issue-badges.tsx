import { AlertTriangle, RotateCcw } from "lucide-react";

export function OverdueBadge({ withIcon }: { withIcon?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-1.5 py-px text-[10px] font-bold text-white leading-4">
      {withIcon && <AlertTriangle className="h-2.5 w-2.5" />}
      Overdue
    </span>
  );
}

export function ReopenedBadge({ count, withIcon }: { count?: number; withIcon?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-1.5 py-px text-[10px] font-bold text-white leading-4">
      {withIcon && <RotateCcw className="h-2.5 w-2.5" />}
      Reopened{count && count > 0 ? ` ${count}x` : ""}
    </span>
  );
}
