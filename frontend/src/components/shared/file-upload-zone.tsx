
import { useRef, useState, useCallback } from "react";
import { Upload, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { FileAttachment } from "@/lib/types";

const DEFAULT_MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const DEFAULT_MAX_FILES = 5;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileUploadZoneProps {
  attachments: FileAttachment[];
  onChange: (attachments: FileAttachment[]) => void;
  readonly?: boolean;
  maxFileSize?: number;
  maxFiles?: number;
}

export function FileUploadZone({
  attachments,
  onChange,
  readonly = false,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  maxFiles = DEFAULT_MAX_FILES,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const processFiles = useCallback(
    async (files: File[]) => {
      const remaining = maxFiles - attachments.length;
      if (remaining <= 0) {
        toast.error(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const toProcess = files.slice(0, remaining);
      if (files.length > remaining) {
        toast.warning(`Only ${remaining} more file${remaining === 1 ? "" : "s"} can be added`);
      }

      const newAttachments: FileAttachment[] = [];

      for (const file of toProcess) {
        if (file.size > maxFileSize) {
          toast.error(`"${file.name}" exceeds ${formatFileSize(maxFileSize)} limit`);
          continue;
        }

        try {
          const dataUrl = await readFileAsDataUrl(file);
          newAttachments.push({
            id: 0,
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type,
            dataUrl,
          });
        } catch {
          toast.error(`Failed to read "${file.name}"`);
        }
      }

      if (newAttachments.length > 0) {
        onChange([...attachments, ...newAttachments]);
      }
    },
    [attachments, onChange, maxFileSize, maxFiles],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        processFiles(Array.from(e.target.files));
        e.target.value = ""; // reset so same file can be re-selected
      }
    },
    [processFiles],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files?.length) {
        processFiles(Array.from(e.dataTransfer.files));
      }
    },
    [processFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const removeAttachment = useCallback(
    (index: number) => {
      onChange(attachments.filter((_, i) => i !== index));
    },
    [attachments, onChange],
  );

  return (
    <div className="space-y-3">
      {/* ── Upload Zone ── */}
      {!readonly && (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              "relative flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 text-center transition-colors cursor-pointer",
              dragging
                ? "border-primary bg-primary/5"
                : "border-border/50 bg-muted/10 hover:border-primary/40 hover:bg-muted/20",
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/40">
              <Upload className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {dragging ? "Drop files here..." : "Drag and drop files here, or click to browse"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground/60">
                Max {formatFileSize(maxFileSize)} per file, up to {maxFiles} files
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Attachment Grid ── */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {attachments.map((att, index) => (
            <div
              key={att.id || index}
              className="group relative rounded-lg border bg-muted/20 p-2"
            >
              {/* Preview — clickable for images & PDFs */}
              {att.contentType.startsWith("image/") ? (
                <a href={att.dataUrl} target="_blank" rel="noopener noreferrer" className="block cursor-pointer">
                  <img
                    src={att.dataUrl}
                    alt={att.fileName}
                    loading="lazy"
                    className="w-full h-24 object-cover rounded mb-2 hover:opacity-80 transition-opacity"
                  />
                </a>
              ) : att.contentType === "application/pdf" ? (
                <a href={att.dataUrl} target="_blank" rel="noopener noreferrer" className="block cursor-pointer">
                  <div className="w-full h-24 flex flex-col items-center justify-center bg-red-50 rounded mb-2 hover:bg-red-100 transition-colors">
                    <FileText className="h-7 w-7 text-red-400" />
                    <span className="text-[10px] font-medium text-red-500 mt-1">PDF</span>
                  </div>
                </a>
              ) : (
                <div className="w-full h-24 flex items-center justify-center bg-muted/30 rounded mb-2">
                  <FileText className="h-8 w-8 text-muted-foreground/40" />
                </div>
              )}

              {/* Metadata */}
              <p className="text-xs font-medium truncate">{att.fileName}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(att.fileSize)}</p>

              {/* Remove button */}
              {!readonly && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAttachment(index);
                  }}
                  className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
                  aria-label={`Remove ${att.fileName}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
