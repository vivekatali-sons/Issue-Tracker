
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IssuesEmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
}

export function IssuesEmptyState({ hasFilters, onClearFilters }: IssuesEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card py-16">
      <SearchX className="h-10 w-10 text-muted-foreground/50" />
      <p className="mt-4 text-lg font-medium text-foreground">No issues found</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasFilters
          ? "Try adjusting your filters or search terms"
          : "Create your first issue to get started"}
      </p>
      {hasFilters && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onClearFilters}>
          Clear all filters
        </Button>
      )}
    </div>
  );
}
