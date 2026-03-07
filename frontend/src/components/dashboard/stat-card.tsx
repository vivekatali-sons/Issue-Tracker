
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  accentColor?: string;
  numberColor?: string;
  glowColor?: string;
  className?: string;
  onClick?: () => void;
}

export function StatCard({ title, value, icon, accentColor, numberColor, glowColor, className, onClick }: StatCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border shadow-sm transition-all duration-250",
        onClick && "cursor-pointer hover:-translate-y-1 hover:shadow-lg",
        className,
      )}
      style={glowColor ? { ["--glow" as string]: glowColor } : undefined}
      onClick={onClick}
    >
      {/* Top accent bar */}
      <div className={cn("absolute inset-x-0 top-0 h-[2px] z-[1]", accentColor ?? "bg-gold")} />

      <CardContent className="flex items-center justify-between px-3 py-4">
        <div className="space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className={cn("text-2xl font-extrabold leading-none tracking-tight", numberColor ?? "text-foreground")}>
            {value}
          </p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-muted/60 dark:bg-white/[0.07] dark:border dark:border-white/10 dark:backdrop-blur-sm">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
