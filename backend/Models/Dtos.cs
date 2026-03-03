namespace DMS.API.Models;

// ── Request DTOs ──

public record CreateIssueRequest(
    string ProcessId,
    string TaskId,
    DateTime IssueDate,
    string IssueRaisedBy,
    string IssueTitle,
    string IssueDescription,
    string Severity,
    string AssignedTo,
    DateTime? AssigningDate,
    DateTime? DueDate,
    List<string> DependentProcesses,
    List<CreateAttachmentRequest> Attachments
);

public record CreateAttachmentRequest(
    string FileName,
    long FileSize,
    string ContentType,
    string DataUrl
);

public record UpdateIssueRequest(
    string? IssueTitle,
    string? IssueDescription,
    string? Status,
    string? AssignedTo,
    DateTime? AssigningDate,
    DateTime? DueDate,
    string? Severity,
    string? ProcessId = null,
    string? TaskId = null,
    string? ModifiedBy = null
);

public record ResolveIssueRequest(
    string ResolvedBy,
    string ResolutionNotes,
    string RootCause,
    string PreventiveMeasures,
    List<string> TestedBy,
    DateTime? VerificationDate,
    List<DepProcessTestRequest> DependentProcessesTestResults
);

public record DepProcessTestRequest(
    string ProcessId,
    bool Tested,
    List<string> TestedBy,
    DateTime? TestDate
);

public record ReopenIssueRequest(
    string ReopenReason,
    string AssignedTo,
    DateTime? DueDate,
    string? ModifiedBy = null
);

// ── Response DTOs ──

public record IssueListItem(
    int Id,
    string ProcessId,
    string TaskId,
    string IssueTitle,
    string Status,
    string Severity,
    string AssignedTo,
    string IssueRaisedBy,
    DateTime IssueDate,
    DateTime? DueDate,
    int CurrentVersion,
    int ReopenCount,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

// ── Bulk Upload DTOs ──

public record BulkUploadRowError(
    int RowNumber,
    string? SrNumber,
    List<string> Errors,
    Dictionary<string, string?>? RowData = null
);

public record BulkUploadResult(
    int TotalRows,
    int SuccessCount,
    int FailedCount,
    List<int> CreatedIssueIds,
    List<BulkUploadRowError> FailedRows
);

// ── Detail Response DTOs ──

public record IssueDetailResponse(
    int Id,
    string ProcessId,
    string TaskId,
    DateTime IssueDate,
    string IssueRaisedBy,
    string IssueTitle,
    string IssueDescription,
    string Status,
    string Severity,
    string AssignedTo,
    DateTime? AssigningDate,
    DateTime? DueDate,
    int CurrentVersion,
    int ReopenCount,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<string> DependentProcesses,
    List<FileAttachment> Attachments,
    List<IssueVersion> Versions,
    Resolution? Resolution
);
