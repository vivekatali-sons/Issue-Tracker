
import { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import { Upload, FileText, CheckCircle2, AlertCircle, Download, Loader2, X, AlertTriangle } from "lucide-react";
import { useIssues } from "@/hooks/use-issues";
import type { ApiBulkUploadResult } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "idle" | "preview" | "uploading" | "done";

interface CsvPreview {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
  missingColumns: string[];
  warnings: string[];
}

const REQUIRED_COLUMNS = [
  "Issue Description",
  "Raised By",
  "Module",
];

const EXPECTED_COLUMNS = [
  "SR#",
  "Issue Description",
  "Raised By",
  "Raised On",
  "Module",
  "Screen Name",
  "Type of Issue",
  "Severity",
  "Status",
  "Resolved On",
  "Comments",
  "Assigned To",
  "Issue Date",
  "Due Date",
];

// Also accept alternate column names from Issue Register_2 format
const COLUMN_ALIASES: Record<string, string> = {
  "Actions": "Issue Description",
  "Category": "Type of Issue",
  "Responsibility": "Assigned To",
  "Asigned to": "Assigned To",
  "Resolved Date": "Resolved On",
  "Due date to close": "Due Date",
  "Due Date to close": "Due Date",
  "Severity ": "Severity",
  "Actions ": "Issue Description",
};

function resolveColumnName(header: string): string {
  const trimmed = header.trim();
  return COLUMN_ALIASES[trimmed] ?? COLUMN_ALIASES[header] ?? trimmed;
}

export function BulkUploadDialog({ open, onOpenChange }: BulkUploadDialogProps) {
  const { bulkUpload } = useIssues();
  const [step, setStep] = useState<Step>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [result, setResult] = useState<ApiBulkUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("idle");
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setDragOver(false);
  }, []);

  const handleClose = useCallback((open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  }, [onOpenChange, reset]);

  const parseAndPreview = useCallback((f: File) => {
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawHeaders = results.meta.fields ?? [];
        const resolvedHeaders = rawHeaders.map(resolveColumnName);

        // Check for required columns
        const missingColumns: string[] = [];
        for (const req of REQUIRED_COLUMNS) {
          if (!resolvedHeaders.some(h => h.toLowerCase() === req.toLowerCase())) {
            missingColumns.push(req);
          }
        }

        // Check for date columns (at least one needed)
        const hasDateCol = resolvedHeaders.some(h =>
          ["Raised On", "Issue Date"].includes(h)
        );

        const warnings: string[] = [];
        if (!hasDateCol) {
          warnings.push("No date column found (Raised On or Issue Date). All rows will fail validation.");
        }

        // Check for optional but recommended columns
        const hasAssignedTo = resolvedHeaders.some(h => h.toLowerCase() === "assigned to");
        if (!hasAssignedTo) {
          warnings.push("No 'Assigned To' column found. Issues will be created without an assignee.");
        }

        const dataRows = (results.data as Record<string, string>[]).filter(row => {
          // Filter out truly empty rows
          return Object.values(row).some(v => v && v.trim() !== "");
        });

        setPreview({
          headers: resolvedHeaders,
          rows: dataRows.slice(0, 5), // First 5 rows for preview
          totalRows: dataRows.length,
          missingColumns,
          warnings,
        });
        setStep("preview");
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
      },
    });
  }, []);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv")) {
      setError("Only .csv files are accepted");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("File must be under 5MB");
      return;
    }
    setError(null);
    setFile(f);
    parseAndPreview(f);
  }, [parseAndPreview]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setStep("uploading");
    setError(null);
    try {
      const res = await bulkUpload(file);
      setResult(res);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStep("preview");
    }
  }, [file, bulkUpload]);

  const hasCriticalErrors = (preview?.missingColumns.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl p-0">
        <DialogHeader className="flex-shrink-0 border-b bg-muted/40 dark:bg-white/[0.03] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Upload className="h-[18px] w-[18px] text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">Bulk Upload Issues</DialogTitle>
              <DialogDescription className="mt-0.5">
                Upload a CSV file to create multiple issues at once.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Step: Idle — file picker */}
          {step === "idle" && (
            <div className="space-y-4">
              <div
                className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <Upload className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium">
                  Drag & drop your CSV file here
                </p>
                <p className="mt-1 text-xs text-muted-foreground">or</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => inputRef.current?.click()}
                >
                  Browse Files
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step: Preview — show parsed CSV info */}
          {step === "preview" && preview && file && (
            <div className="space-y-4">
              {/* File info */}
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB · {preview.totalRows} data row{preview.totalRows !== 1 ? "s" : ""} · {preview.headers.length} columns
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={reset}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Missing required columns — critical error */}
              {preview.missingColumns.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Missing required columns:</p>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      {preview.missingColumns.map(col => (
                        <li key={col}>{col}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs">Please update your CSV to include these columns. Download the template for reference.</p>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {preview.warnings.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    {preview.warnings.map((w, i) => (
                      <p key={i}>{w}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* CSV format validation */}
              {!hasCriticalErrors && (
                <div className="flex items-center gap-3 rounded-xl bg-green-50/80 px-4 py-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-900">CSV validated successfully</p>
                    <p className="text-xs text-green-700/80">All required columns are present.</p>
                  </div>
                </div>
              )}

              {/* Preview table */}
              {preview.rows.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    Preview (first {preview.rows.length} of {preview.totalRows} rows):
                  </p>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-medium whitespace-nowrap">#</th>
                          {preview.headers.slice(0, 6).map(h => (
                            <th key={h} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">{h}</th>
                          ))}
                          {preview.headers.length > 6 && (
                            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">+{preview.headers.length - 6} more</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {preview.rows.map((row, i) => {
                          const values = preview.headers.map(h => {
                            // Try original header names from the raw data
                            return Object.entries(row).find(([k]) =>
                              resolveColumnName(k) === h
                            )?.[1] ?? "";
                          });
                          return (
                            <tr key={i}>
                              <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                              {values.slice(0, 6).map((v, j) => (
                                <td key={j} className="px-2 py-1.5 max-w-[200px] truncate">{v || "—"}</td>
                              ))}
                              {preview.headers.length > 6 && (
                                <td className="px-2 py-1.5 text-muted-foreground">...</td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step: Uploading */}
          {step === "uploading" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-sm font-medium">Uploading and processing...</p>
              <p className="mt-1 text-xs text-muted-foreground">This may take a moment for large files</p>
            </div>
          )}

          {/* Step: Done — results */}
          {step === "done" && result && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-bold">{result.totalRows}</p>
                  <p className="text-xs text-muted-foreground">Total Rows</p>
                </div>
                <div className="rounded-lg border bg-green-50 border-green-200 p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{result.successCount}</p>
                  <p className="text-xs text-green-600">Imported</p>
                </div>
                <div className={`rounded-lg border p-3 text-center ${
                  result.failedCount > 0 ? "bg-red-50 border-red-200" : "bg-muted/30"
                }`}>
                  <p className={`text-2xl font-bold ${result.failedCount > 0 ? "text-red-700" : ""}`}>
                    {result.failedCount}
                  </p>
                  <p className={`text-xs ${result.failedCount > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                    Skipped
                  </p>
                </div>
              </div>

              {result.successCount > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Successfully created {result.successCount} issue{result.successCount !== 1 ? "s" : ""}.
                </div>
              )}

              {/* Failed rows — download as CSV */}
              {result.failedRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{result.failedCount} row{result.failedCount !== 1 ? "s" : ""} failed validation</p>
                      <p className="text-xs mt-1 opacity-80">
                        Download the error report to see which rows failed and why. Fix the issues and re-upload.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                    onClick={() => {
                      // Build CSV rows from failed row data
                      const csvHeaders = [
                        "Row #", "SR#", "Issue Description", "Raised By", "Raised On",
                        "Module", "Screen Name", "Type of Issue", "Severity", "Status",
                        "Resolved On", "Comments", "Assigned To", "Issue Date", "Due Date", "Errors"
                      ];
                      const csvRows = result.failedRows.map(row => {
                        const d = row.rowData ?? {};
                        return [
                          row.rowNumber,
                          d["SR#"] ?? row.srNumber ?? "",
                          d["Issue Description"] ?? "",
                          d["Raised By"] ?? "",
                          d["Raised On"] ?? "",
                          d["Module"] ?? "",
                          d["Screen Name"] ?? "",
                          d["Type of Issue"] ?? "",
                          d["Severity"] ?? "",
                          d["Status"] ?? "",
                          d["Resolved On"] ?? "",
                          d["Comments"] ?? "",
                          d["Assigned To"] ?? "",
                          d["Issue Date"] ?? "",
                          d["Due Date"] ?? "",
                          row.errors.join("; "),
                        ];
                      });
                      const csvContent = Papa.unparse({ fields: csvHeaders, data: csvRows });
                      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `bulk-upload-errors-${new Date().toISOString().slice(0, 10)}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Error Report ({result.failedCount} row{result.failedCount !== 1 ? "s" : ""})
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t px-6 py-4 gap-2">
          {step === "idle" && (
            <>
              <a href="/sample-issues.csv" download className="mr-auto">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Download Template
                </Button>
              </a>
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
            </>
          )}
          {step === "preview" && (
            <>
              <a href="/sample-issues.csv" download className="mr-auto">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Download Template
                </Button>
              </a>
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button onClick={handleUpload} disabled={hasCriticalErrors}>
                <Upload className="h-4 w-4 mr-2" />
                Upload {preview?.totalRows ?? 0} Row{(preview?.totalRows ?? 0) !== 1 ? "s" : ""}
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={() => handleClose(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
