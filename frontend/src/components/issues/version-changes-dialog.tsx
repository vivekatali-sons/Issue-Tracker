
import { FileSearch } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMasterData } from "@/hooks/use-master-data";
import type { IssueVersion, FieldChange } from "@/lib/types";

interface VersionChangesDialogProps {
  version: IssueVersion;
  action: string;
  actor: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Fields whose values are user IDs — display name instead of raw ID
const USER_FIELDS = new Set(["Assigned To"]);

export function VersionChangesDialog({
  version,
  action,
  actor,
  open,
  onOpenChange,
}: VersionChangesDialogProps) {
  const { getUserName } = useMasterData();
  const changes = version.changesSummary ?? [];

  function formatValue(field: string, value: string | null): string {
    if (value === null || value === "") return "(empty)";
    if (USER_FIELDS.has(field)) return getUserName(value);
    return value;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg p-0">
        {/* Fixed header */}
        <DialogHeader className="flex-shrink-0 border-b bg-muted/40 dark:bg-white/[0.03] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10">
              <FileSearch className="h-[18px] w-[18px] text-indigo-600" />
            </div>
            <div>
              <DialogTitle className="text-base">Change Details</DialogTitle>
              <DialogDescription className="mt-0.5">
                {action} by {actor} &middot; V{version.versionNumber}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {changes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No change details recorded for this entry.
            </p>
          ) : (
            <div className="space-y-3 font-mono text-sm">
              {changes.map((change, idx) => (
                <ChangeBlock key={idx} change={change} isCreate={action === "Created"} formatValue={formatValue} />
              ))}
            </div>
          )}
        </div>

        {/* Fixed footer */}
        <DialogFooter className="flex-shrink-0 border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangeBlock({ change, isCreate, formatValue }: { change: FieldChange; isCreate: boolean; formatValue: (field: string, value: string | null) => string }) {
  const fromDisplay = formatValue(change.field, change.from);
  const toDisplay = formatValue(change.field, change.to);

  return (
    <div className="rounded-md border overflow-hidden">
      {/* Field header */}
      <div className="bg-muted/50 px-3 py-1.5 border-b">
        <span className="font-semibold text-xs text-foreground/80 font-sans">
          {change.field}
        </span>
      </div>

      {/* Diff lines */}
      <div className="text-[13px] leading-relaxed">
        {/* Show "from" line only if this is NOT a create action and from exists */}
        {!isCreate && change.from !== null && (
          <div className="bg-red-50 text-red-700 px-3 py-1 dark:bg-red-950/30 dark:text-red-400">
            <span className="select-none mr-2 text-red-400">-</span>
            {fromDisplay}
          </div>
        )}
        {/* Show "to" line */}
        {change.to !== null && (
          <div className="bg-green-50 text-green-700 px-3 py-1 dark:bg-green-950/30 dark:text-green-400">
            <span className="select-none mr-2 text-green-400">+</span>
            {toDisplay}
          </div>
        )}
      </div>
    </div>
  );
}
