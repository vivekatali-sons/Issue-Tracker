import { Button } from "@/components/ui/button";
import { X, CheckCircle2, XCircle } from "lucide-react";

interface BulkActionBarProps {
  count: number;
  onActivate: () => void;
  onDeactivate: () => void;
  onClear: () => void;
  loading?: boolean;
}

export function BulkActionBar({ count, onActivate, onDeactivate, onClear, loading }: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-primary px-1.5 text-xs font-bold text-primary-foreground">
          {count}
        </span>
        <span className="font-medium text-foreground">selected</span>
      </div>
      <div className="h-4 w-px bg-border" />
      <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={onActivate} disabled={loading}>
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        Activate
      </Button>
      <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={onDeactivate} disabled={loading}>
        <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
        Deactivate
      </Button>
      <Button variant="ghost" size="icon" className="ml-auto h-7 w-7 rounded-lg" onClick={onClear}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
