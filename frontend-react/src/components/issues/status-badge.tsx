import { useMasterData } from "@/hooks/use-master-data";
import { cn } from "@/lib/utils";
import { safeClass } from "@/lib/safe-class";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { getStatusConfig } = useMasterData();
  const config = getStatusConfig(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        safeClass(config.bgColor),
        safeClass(config.textColor),
        className,
      )}
    >
      {config.label}
    </span>
  );
}
