import { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import {
  Upload, FileText, CheckCircle2, AlertCircle, Loader2, X,
  Download, AlertTriangle,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { exportToCsv } from "@/lib/utils";

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  requiredColumns: string[];
  /** Sample rows for the downloadable template (1-3 example rows) */
  sampleData: string[][];
  /** Validate a single normalized row. Return error string or null if valid. */
  validateRow?: (row: Record<string, string>) => string | null;
  createItem: (row: Record<string, string>) => Promise<void>;
  onComplete: () => void;
}

type Step = "idle" | "preview" | "uploading" | "done";

interface RowValidation {
  normalized: Record<string, string>;
  index: number;
  error: string | null;
}

interface CsvPreview {
  headers: string[];
  rawRows: Record<string, string>[];
  totalRows: number;
  missingColumns: string[];
  validations: RowValidation[];
}

interface ImportResult {
  totalRows: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: { row: number; message: string; rowData: Record<string, string> }[];
}

/** Turn raw API / SQL errors into user-friendly messages */
function friendlyError(msg: string): string {
  // Duplicate key
  const dupMatch = msg.match(/duplicate key value is \((.+?)\)/i);
  if (dupMatch) return `"${dupMatch[1]}" already exists`;
  if (/unique.*constraint/i.test(msg)) return "Duplicate entry — this item already exists";
  // Strip "API 500:" prefix
  const cleaned = msg.replace(/^API \d+:\s*/i, "").replace(/^\{"error":"/, "").replace(/"\}$/, "").replace(/\\r\\n.*/, "");
  return cleaned || msg;
}

export function CsvImportDialog({
  open, onOpenChange, title, requiredColumns, sampleData, validateRow, createItem, onComplete,
}: CsvImportDialogProps) {
  const [step, setStep] = useState<Step>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
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
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  function handleClose(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  function handleDownloadSample() {
    exportToCsv(`${title.toLowerCase()}-template.csv`, requiredColumns, sampleData);
  }

  function normalizeRow(raw: Record<string, string>): Record<string, string> {
    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      normalized[k.trim().toLowerCase()] = (v ?? "").trim();
    }
    return normalized;
  }

  const parseAndPreview = useCallback((f: File) => {
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields ?? [];
        const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());

        // Check for missing required columns
        const missingColumns = requiredColumns.filter(
          (col) => !normalizedHeaders.includes(col.toLowerCase()),
        );

        const rawRows = (results.data as Record<string, string>[]).filter((row) =>
          Object.values(row).some((v) => v && v.trim() !== ""),
        );

        // Validate each row
        const validations: RowValidation[] = rawRows.map((raw, index) => {
          const normalized = normalizeRow(raw);

          // Check required fields are non-empty
          for (const col of requiredColumns) {
            const key = col.toLowerCase();
            if (!normalized[key] || normalized[key].length === 0) {
              return { normalized, index, error: `Missing required field "${col}"` };
            }
          }

          // Custom validation
          if (validateRow) {
            const err = validateRow(normalized);
            if (err) return { normalized, index, error: err };
          }

          return { normalized, index, error: null };
        });

        setPreview({
          headers,
          rawRows,
          totalRows: rawRows.length,
          missingColumns,
          validations,
        });
        setStep("preview");
      },
      error: () => {
        setError("Failed to parse CSV file. Please check the format.");
      },
    });
  }, [requiredColumns, validateRow]);

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

  const validRows = preview?.validations.filter((v) => !v.error) ?? [];
  const invalidRows = preview?.validations.filter((v) => v.error) ?? [];
  const hasCriticalErrors = (preview?.missingColumns.length ?? 0) > 0;
  const canImport = preview && !hasCriticalErrors && validRows.length > 0;

  async function handleImport() {
    if (!preview) return;
    setStep("uploading");

    let successCount = 0;
    const errors: { row: number; message: string; rowData: Record<string, string> }[] = [];

    for (const { normalized, index } of validRows) {
      try {
        await createItem(normalized);
        successCount++;
      } catch (err: unknown) {
        const rawMsg = err instanceof Error ? err.message : "Unknown error";
        errors.push({ row: index + 1, message: friendlyError(rawMsg), rowData: normalized });
      }
    }

    // Also include pre-validation skipped rows
    for (const { normalized, index, error: valErr } of invalidRows) {
      errors.push({ row: index + 1, message: valErr ?? "Validation failed", rowData: normalized });
    }

    // Sort by row number
    errors.sort((a, b) => a.row - b.row);

    setResult({
      totalRows: preview.totalRows,
      successCount,
      failedCount: errors.length - invalidRows.length,
      skippedCount: invalidRows.length,
      errors,
    });
    setStep("done");
    if (successCount > 0) onComplete();
  }

  function downloadErrorReport() {
    if (!result || !preview) return;
    const dataColumns = requiredColumns.map(c => c);
    const headers = ["Row", ...dataColumns, "Error"];
    const rows = result.errors.map(({ row, rowData, message }) => [
      String(row),
      ...requiredColumns.map(col => rowData[col.toLowerCase()] ?? ""),
      message,
    ]);
    exportToCsv(`${title.toLowerCase()}-import-errors.csv`, headers, rows);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import {title} from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to create multiple {title.toLowerCase()} at once. Download the template for the correct format.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 py-2">
          {/* ── Step: Idle — file picker ── */}
          {step === "idle" && (
            <div className="space-y-4">
              {/* Required columns info */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Required columns:</p>
                <div className="flex flex-wrap gap-1.5">
                  {requiredColumns.map((col) => (
                    <span key={col} className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              {/* Drag & drop zone */}
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
                <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-800 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── Step: Preview — validation & table ── */}
          {step === "preview" && preview && file && (
            <div className="space-y-4">
              {/* File info bar */}
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

              {/* Missing columns — critical error */}
              {preview.missingColumns.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-800 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Missing required columns:</p>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      {preview.missingColumns.map((col) => (
                        <li key={col}>{col}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs">Please update your CSV to include these columns. Download the template for reference.</p>
                  </div>
                </div>
              )}

              {/* Validation summary badges */}
              {!hasCriticalErrors && (
                <>
                  {invalidRows.length === 0 ? (
                    <div className="flex items-center gap-3 rounded-xl bg-green-50/80 dark:bg-emerald-950/30 px-4 py-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-green-900 dark:text-emerald-300">CSV validated successfully</p>
                        <p className="text-xs text-green-700/80 dark:text-emerald-400/70">All {validRows.length} row(s) passed validation.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {validRows.length} valid
                      </div>
                      <div className="flex items-center gap-1.5 rounded-md bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {invalidRows.length} with errors (will be skipped)
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Preview table */}
              {preview.rawRows.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    Preview (first {Math.min(preview.rawRows.length, 5)} of {preview.totalRows} rows):
                  </p>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-medium whitespace-nowrap">#</th>
                          <th className="px-2 py-1.5 text-left font-medium whitespace-nowrap w-8">
                            <span className="sr-only">Status</span>
                          </th>
                          {preview.headers.slice(0, 6).map((h) => (
                            <th key={h} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">{h}</th>
                          ))}
                          {preview.headers.length > 6 && (
                            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">+{preview.headers.length - 6} more</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {preview.validations.slice(0, 5).map(({ index, error: rowErr }) => (
                          <tr key={index} className={rowErr ? "bg-destructive/5" : ""}>
                            <td className="px-2 py-1.5 text-muted-foreground">{index + 1}</td>
                            <td className="px-2 py-1.5">
                              {rowErr ? (
                                <span title={rowErr}><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /></span>
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              )}
                            </td>
                            {preview.headers.slice(0, 6).map((h) => (
                              <td key={h} className="px-2 py-1.5 max-w-[180px] truncate">
                                {preview.rawRows[index]?.[h] || "—"}
                              </td>
                            ))}
                            {preview.headers.length > 6 && (
                              <td className="px-2 py-1.5 text-muted-foreground">...</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Validation error details */}
              {invalidRows.length > 0 && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-1 max-h-32 overflow-auto">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Validation errors:</p>
                  {invalidRows.slice(0, 10).map(({ index, error: rowErr }) => (
                    <p key={index} className="text-xs text-amber-700 dark:text-amber-400">
                      Row {index + 1}: {rowErr}
                    </p>
                  ))}
                  {invalidRows.length > 10 && (
                    <p className="text-xs text-amber-600 dark:text-amber-500">... and {invalidRows.length - 10} more</p>
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-800 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── Step: Uploading ── */}
          {step === "uploading" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-sm font-medium">Importing {validRows.length} row(s)...</p>
              <p className="mt-1 text-xs text-muted-foreground">This may take a moment for large files</p>
            </div>
          )}

          {/* ── Step: Done — results ── */}
          {step === "done" && result && (
            <div className="space-y-4">
              {/* Summary grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-bold">{result.totalRows}</p>
                  <p className="text-xs text-muted-foreground">Total Rows</p>
                </div>
                <div className="rounded-lg border bg-green-50 dark:bg-emerald-950/30 border-green-200 dark:border-emerald-800/50 p-3 text-center">
                  <p className="text-2xl font-bold text-green-700 dark:text-emerald-400">{result.successCount}</p>
                  <p className="text-xs text-green-600 dark:text-emerald-500">Imported</p>
                </div>
                <div className={`rounded-lg border p-3 text-center ${
                  (result.failedCount + result.skippedCount) > 0
                    ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50"
                    : "bg-muted/30"
                }`}>
                  <p className={`text-2xl font-bold ${(result.failedCount + result.skippedCount) > 0 ? "text-red-700 dark:text-red-400" : ""}`}>
                    {result.failedCount + result.skippedCount}
                  </p>
                  <p className={`text-xs ${(result.failedCount + result.skippedCount) > 0 ? "text-red-600 dark:text-red-500" : "text-muted-foreground"}`}>
                    Skipped
                  </p>
                </div>
              </div>

              {result.successCount > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 dark:border-emerald-800/50 bg-green-50 dark:bg-emerald-950/30 p-3 text-sm text-green-800 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Successfully created {result.successCount} {title.toLowerCase()}{result.successCount !== 1 ? "" : ""}.
                </div>
              )}

              {/* Failed rows — summary + download only */}
              {result.errors.length > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">
                      {result.errors.length} row{result.errors.length !== 1 ? "s" : ""} failed
                    </p>
                    <p className="text-xs text-red-700/80 dark:text-red-400/70 mt-0.5">
                      Download the error report to see which rows failed and why.
                    </p>
                    <Button variant="outline" size="sm" className="mt-2 gap-1.5 text-xs" onClick={downloadErrorReport}>
                      <Download className="h-3.5 w-3.5" />
                      Download Error Report
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step === "idle" && (
            <>
              <Button variant="ghost" size="sm" className="mr-auto gap-1.5 text-xs" onClick={handleDownloadSample}>
                <Download className="h-3.5 w-3.5" />
                Download Template
              </Button>
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="ghost" size="sm" className="mr-auto gap-1.5 text-xs" onClick={handleDownloadSample}>
                <Download className="h-3.5 w-3.5" />
                Download Template
              </Button>
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button onClick={handleImport} disabled={!canImport}>
                <Upload className="h-4 w-4 mr-2" />
                Import {validRows.length} Row{validRows.length !== 1 ? "s" : ""}
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
