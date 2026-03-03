import { useMasterData } from "@/hooks/use-master-data";
import { cn } from "@/lib/utils";
import { safeClass } from "@/lib/safe-class";

interface SeverityBadgeProps {
  severity: string;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const { getSeverityConfig } = useMasterData();
  const config = getSeverityConfig(severity);
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
