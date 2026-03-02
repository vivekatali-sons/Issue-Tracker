import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Issue } from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a UTC date string from the API into a local Date object.
 * The backend stores all timestamps as UTC (SYSUTCDATETIME) but .NET
 * serializes DateTime with Kind=Unspecified — no "Z" suffix. Without
 * the Z, browsers treat it as local time instead of UTC, so times
 * display wrong. This helper appends "Z" when no timezone indicator
 * is present, ensuring correct local timezone conversion.
 */
export function parseUtcDate(dateStr: string): Date {
  if (/\dZ?$/.test(dateStr) && !dateStr.endsWith("Z") && !dateStr.includes("+")) {
    return new Date(dateStr + "Z");
  }
  return new Date(dateStr);
}

/**
 * Check if an issue is overdue based on its latest version's due date.
 * Returns true when: due date exists, has passed, and issue is not Resolved/Closed.
 */
export function isIssueOverdue(issue: Issue): boolean {
  const dueDate = issue.dueDate;
  return !!(
    dueDate &&
    new Date() > new Date(dueDate) &&
    issue.status !== "Resolved" &&
    issue.status !== "Closed"
  );
}
