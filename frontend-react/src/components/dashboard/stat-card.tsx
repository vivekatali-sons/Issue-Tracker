
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  accentColor?: string;
  numberColor?: string;
  className?: string;
  onClick?: () => void;
}

export function StatCard({ title, value, icon, accentColor, numberColor, className, onClick }: StatCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border shadow-sm transition-all duration-200",
        onClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
      onClick={onClick}
    >
      {/* Top accent bar */}
      <div className={cn("absolute inset-x-0 top-0 h-[3px]", accentColor ?? "bg-gold")} />

      <CardContent className="flex items-center justify-between px-5 py-5">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {title}
          </p>
          <p className={cn("text-[2rem] font-extrabold leading-none tracking-tight", numberColor ?? "text-foreground")}>
            {value}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
