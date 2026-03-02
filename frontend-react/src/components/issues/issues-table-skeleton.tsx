
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export function IssuesTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      {/* KPI strip skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-lg" />
        ))}
      </div>

      {/* Toolbar skeleton */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-[120px]" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-[140px]" />
          <Skeleton className="h-9 w-[140px]" />
          <Skeleton className="h-9 w-[160px]" />
          <Skeleton className="h-9 w-[150px]" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {["w-[200px]", "w-[100px]", "w-[100px]", "w-[80px]", "w-[90px]", "w-[90px]"].map(
                (w, i) => (
                  <TableHead key={i}>
                    <Skeleton className={`h-4 ${w}`} />
                  </TableHead>
                )
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-[200px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-[100px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-[90px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-[60px] rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-[70px] rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-[80px]" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
