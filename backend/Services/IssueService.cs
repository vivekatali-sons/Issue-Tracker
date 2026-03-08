using System.Globalization;
using System.Text.Json;
using CsvHelper;
using CsvHelper.Configuration;
using DMS.API.Models;
using DMS.API.Repositories;
using Microsoft.AspNetCore.Http;

namespace DMS.API.Services;

public class IssueService(IIssueRepository repo, IMasterDataRepository masterRepo, IAuditRepository auditRepo, IHttpContextAccessor httpContextAccessor) : IIssueService
{
    private string? ClientIp => httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();
    public async Task<IEnumerable<IssueListItem>> GetAllAsync()
    {
        var issues = await repo.GetAllAsync();
        return issues.Select(i => new IssueListItem(
            i.Id, i.ProcessId, i.TaskId, i.IssueTitle, i.Status, i.Severity,
            i.AssignedTo, i.IssueRaisedBy, i.IssueDate, i.DueDate,
            i.CurrentVersion, i.ReopenCount, i.CreatedAt, i.UpdatedAt
        ));
    }

    public async Task<IssueDetailResponse?> GetByIdAsync(int id)
    {
        var issue = await repo.GetByIdAsync(id);
        if (issue is null) return null;

        // Hydrate navigation properties in parallel (independent queries)
        var depsTask = repo.GetDependentProcessesAsync(id);
        var attachmentsTask = repo.GetAttachmentsAsync(id);
        var versionsTask = repo.GetVersionsAsync(id);
        var resolutionTask = repo.GetLatestResolutionAsync(id);

        await Task.WhenAll(depsTask, attachmentsTask, versionsTask, resolutionTask);

        var deps = await depsTask;
        var attachments = await attachmentsTask;
        var versions = await versionsTask;
        var resolution = await resolutionTask;

        if (resolution is not null)
        {
            // These depend on resolutionId but are independent of each other
            var testersTask = repo.GetResolutionTestersAsync(resolution.Id);
            var depTestsTask = repo.GetDepTestResultsForResolutionAsync(resolution.Id);
            await Task.WhenAll(testersTask, depTestsTask);
            resolution.TestedBy = await testersTask;
            resolution.DependentProcessesTestResults = await depTestsTask;
        }

        return new IssueDetailResponse(
            issue.Id, issue.ProcessId, issue.TaskId, issue.IssueDate,
            issue.IssueRaisedBy, issue.IssueTitle, issue.IssueDescription,
            issue.Status, issue.Severity, issue.AssignedTo, issue.AssigningDate,
            issue.DueDate, issue.CurrentVersion, issue.ReopenCount,
            issue.CreatedAt, issue.UpdatedAt,
            deps, attachments, versions, resolution
        );
    }

    public async Task<int> CreateAsync(CreateIssueRequest request)
    {
        var issue = new Issue
        {
            ProcessId = request.ProcessId,
            TaskId = request.TaskId,
            IssueDate = request.IssueDate == default ? DateTime.UtcNow : request.IssueDate,
            IssueRaisedBy = request.IssueRaisedBy,
            IssueTitle = request.IssueTitle,
            IssueDescription = request.IssueDescription,
            Severity = request.Severity,
            AssignedTo = request.AssignedTo,
            AssigningDate = request.AssigningDate,
            DueDate = request.DueDate,
            Status = "New",
            CurrentVersion = 1,
            ReopenCount = 0,
        };

        var issueId = await repo.CreateAsync(issue);

        // Dependent processes
        if (request.DependentProcesses?.Count > 0)
            await repo.SetDependentProcessesAsync(issueId, request.DependentProcesses);

        // Attachments
        if (request.Attachments?.Count > 0)
        {
            var attachments = request.Attachments.Select(a => new FileAttachment
            {
                FileName = a.FileName,
                FileSize = a.FileSize,
                ContentType = a.ContentType,
                DataUrl = a.DataUrl,
            }).ToList();
            await repo.AddAttachmentsAsync(issueId, attachments);
        }

        // Build changes for "Created" entry — from is null (new values only)
        var changes = new List<FieldChange>
        {
            new("Title", null, request.IssueTitle),
            new("Severity", null, request.Severity),
            new("Assigned To", null, request.AssignedTo),
            new("Status", null, "New"),
        };
        if (request.DueDate is not null)
            changes.Add(new("Due Date", null, request.DueDate.Value.ToString("yyyy-MM-dd")));
        if (!string.IsNullOrWhiteSpace(request.IssueDescription))
            changes.Add(new("Description", null, request.IssueDescription));

        // Create version 1
        await repo.AddVersionAsync(new IssueVersion
        {
            IssueId = issueId,
            VersionNumber = 1,
            AssignedTo = request.AssignedTo,
            AssigningDate = request.AssigningDate,
            DueDate = request.DueDate,
            Status = "New",
            ChangesSummary = BuildChangesJson(changes),
            ModifiedBy = request.IssueRaisedBy,
        });

        await auditRepo.InsertAsync(new AuditLog
        {
            Action = "Created",
            EntityType = "Issue",
            EntityId = issueId,
            UserId = request.IssueRaisedBy,
            Details = BuildChangesJson(changes),
            IpAddress = ClientIp,
        });

        return issueId;
    }

    public async Task UpdateAsync(int id, UpdateIssueRequest request)
    {
        var issue = await repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Issue {id} not found");

        // Capture old values BEFORE applying changes
        var changes = new List<FieldChange>();

        if (request.IssueTitle is not null && request.IssueTitle != issue.IssueTitle)
            changes.Add(new("Title", issue.IssueTitle, request.IssueTitle));
        if (request.IssueDescription is not null && request.IssueDescription != issue.IssueDescription)
            changes.Add(new("Description", issue.IssueDescription, request.IssueDescription));
        if (request.Status is not null && request.Status != issue.Status)
            changes.Add(new("Status", issue.Status, request.Status));
        if (request.Severity is not null && request.Severity != issue.Severity)
            changes.Add(new("Severity", issue.Severity, request.Severity));
        if (request.AssignedTo is not null && request.AssignedTo != issue.AssignedTo)
            changes.Add(new("Assigned To", issue.AssignedTo, request.AssignedTo));
        if (request.DueDate is not null && request.DueDate.Value.Date != issue.DueDate?.Date)
            changes.Add(new("Due Date",
                issue.DueDate?.ToString("yyyy-MM-dd"),
                request.DueDate.Value.ToString("yyyy-MM-dd")));
        if (request.AssigningDate is not null && request.AssigningDate.Value.Date != issue.AssigningDate?.Date)
            changes.Add(new("Assigning Date",
                issue.AssigningDate?.ToString("yyyy-MM-dd"),
                request.AssigningDate.Value.ToString("yyyy-MM-dd")));
        if (request.ProcessId is not null && request.ProcessId != issue.ProcessId)
            changes.Add(new("Process", issue.ProcessId, request.ProcessId));
        if (request.TaskId is not null && request.TaskId != issue.TaskId)
            changes.Add(new("Task", issue.TaskId, request.TaskId));

        // Apply changes
        if (request.IssueTitle is not null) issue.IssueTitle = request.IssueTitle;
        if (request.IssueDescription is not null) issue.IssueDescription = request.IssueDescription;
        if (request.Status is not null) issue.Status = request.Status;
        if (request.AssignedTo is not null) issue.AssignedTo = request.AssignedTo;
        if (request.AssigningDate is not null) issue.AssigningDate = request.AssigningDate;
        if (request.DueDate is not null) issue.DueDate = request.DueDate;
        if (request.Severity is not null) issue.Severity = request.Severity;
        if (request.ProcessId is not null) issue.ProcessId = request.ProcessId;
        if (request.TaskId is not null) issue.TaskId = request.TaskId;

        await repo.UpdateAsync(issue);

        // Snapshot to timeline with diff
        await repo.AddVersionAsync(new IssueVersion
        {
            IssueId = id,
            VersionNumber = issue.CurrentVersion,
            AssignedTo = issue.AssignedTo,
            AssigningDate = issue.AssigningDate,
            DueDate = issue.DueDate,
            Status = issue.Status,
            ChangesSummary = changes.Count > 0 ? BuildChangesJson(changes) : null,
            ModifiedBy = request.ModifiedBy,
        });

        if (changes.Count > 0)
        {
            await auditRepo.InsertAsync(new AuditLog
            {
                Action = "Updated",
                EntityType = "Issue",
                EntityId = id,
                UserId = request.ModifiedBy ?? "system",
                Details = BuildChangesJson(changes),
                IpAddress = ClientIp,
            });
        }
    }

    public async Task DeleteAsync(int id, string? deletedBy = null)
    {
        var issue = await repo.GetByIdAsync(id);
        await repo.DeleteAsync(id, deletedBy);

        await auditRepo.InsertAsync(new AuditLog
        {
            Action = "Deleted",
            EntityType = "Issue",
            EntityId = id,
            UserId = deletedBy ?? "system",
            Details = issue is not null
                ? JsonSerializer.Serialize(new { issue.IssueTitle, issue.Status, issue.Severity, issue.AssignedTo })
                : null,
            IpAddress = ClientIp,
        });
    }

    public async Task ResolveAsync(int id, ResolveIssueRequest request)
    {
        var issue = await repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Issue {id} not found");

        // Create resolution (default optional text fields to empty string for SQL NOT NULL columns)
        var resolution = new Resolution
        {
            IssueId = id,
            VersionNumber = issue.CurrentVersion,
            ResolvedBy = request.ResolvedBy,
            ResolutionNotes = request.ResolutionNotes ?? string.Empty,
            RootCause = request.RootCause ?? string.Empty,
            PreventiveMeasures = request.PreventiveMeasures ?? string.Empty,
            VerificationDate = request.VerificationDate,
        };
        var resolutionId = await repo.AddResolutionAsync(resolution);

        // Testers
        if (request.TestedBy?.Count > 0)
            await repo.AddResolutionTestersAsync(resolutionId, request.TestedBy);

        // Dep test results
        foreach (var dep in request.DependentProcessesTestResults ?? [])
        {
            var testResultId = await repo.AddDepTestResultAsync(new DependentProcessTestResult
            {
                ResolutionId = resolutionId,
                ProcessId = dep.ProcessId,
                Tested = dep.Tested,
                TestDate = dep.TestDate,
            });
            if (dep.TestedBy?.Count > 0)
                await repo.AddTestResultTestersAsync(testResultId, dep.TestedBy);
        }

        // Build resolve changes
        var oldStatus = issue.Status;
        var changes = new List<FieldChange>
        {
            new("Status", oldStatus, "Resolved"),
        };
        if (!string.IsNullOrWhiteSpace(request.ResolutionNotes))
            changes.Add(new("Resolution Notes", null, request.ResolutionNotes));
        if (!string.IsNullOrWhiteSpace(request.RootCause))
            changes.Add(new("Root Cause", null, request.RootCause));
        if (!string.IsNullOrWhiteSpace(request.PreventiveMeasures))
            changes.Add(new("Preventive Measures", null, request.PreventiveMeasures));

        // Update issue status
        issue.Status = "Resolved";
        await repo.UpdateAsync(issue);

        // Snapshot version
        await repo.AddVersionAsync(new IssueVersion
        {
            IssueId = id,
            VersionNumber = issue.CurrentVersion,
            AssignedTo = issue.AssignedTo,
            AssigningDate = issue.AssigningDate,
            DueDate = issue.DueDate,
            Status = "Resolved",
            ChangesSummary = BuildChangesJson(changes),
            ModifiedBy = request.ResolvedBy,
        });

        await auditRepo.InsertAsync(new AuditLog
        {
            Action = "Resolved",
            EntityType = "Issue",
            EntityId = id,
            UserId = request.ResolvedBy,
            Details = BuildChangesJson(changes),
            IpAddress = ClientIp,
        });
    }

    public async Task ReopenAsync(int id, ReopenIssueRequest request)
    {
        var issue = await repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Issue {id} not found");

        // Build reopen changes before mutating
        var oldStatus = issue.Status;
        var oldVersion = issue.CurrentVersion;
        var oldAssignedTo = issue.AssignedTo;
        var oldDueDate = issue.DueDate;

        var changes = new List<FieldChange>
        {
            new("Status", oldStatus, "Reopened"),
            new("Version", oldVersion.ToString(), (oldVersion + 1).ToString()),
        };
        if (request.AssignedTo != oldAssignedTo)
            changes.Add(new("Assigned To", oldAssignedTo, request.AssignedTo));
        if (request.DueDate != oldDueDate)
            changes.Add(new("Due Date",
                oldDueDate?.ToString("yyyy-MM-dd"),
                request.DueDate?.ToString("yyyy-MM-dd")));
        if (!string.IsNullOrWhiteSpace(request.ReopenReason))
            changes.Add(new("Reopen Reason", null, request.ReopenReason));

        issue.Status = "Reopened";
        issue.CurrentVersion++;
        issue.ReopenCount++;
        issue.AssignedTo = request.AssignedTo;
        issue.DueDate = request.DueDate;

        await repo.UpdateAsync(issue);

        await repo.AddVersionAsync(new IssueVersion
        {
            IssueId = id,
            VersionNumber = issue.CurrentVersion,
            AssignedTo = request.AssignedTo,
            DueDate = request.DueDate,
            Status = "Reopened",
            ReopenReason = request.ReopenReason,
            ChangesSummary = BuildChangesJson(changes),
            ModifiedBy = request.ModifiedBy,
        });

        await auditRepo.InsertAsync(new AuditLog
        {
            Action = "Reopened",
            EntityType = "Issue",
            EntityId = id,
            UserId = request.ModifiedBy ?? "system",
            Details = BuildChangesJson(changes),
            IpAddress = ClientIp,
        });
    }

    // ── Bulk Upload ──

    private static readonly string[] DateFormats =
    [
        "dd-MMM-yy", "dd-MMM-yyyy", "dd/MM/yyyy", "yyyy-MM-dd",
        "d-MMM-yy", "d-MMM-yyyy", "d/MM/yyyy", "MM/dd/yyyy"
    ];

    public async Task<BulkUploadResult> BulkCreateFromCsvAsync(Stream csvStream)
    {
        // Load ALL master data in parallel for strict validation
        var statusesTask = masterRepo.GetStatusesAsync();
        var severitiesTask = masterRepo.GetSeveritiesAsync();
        var processesTask = masterRepo.GetProcessesAsync();
        var usersTask = masterRepo.GetUsersAsync();
        await Task.WhenAll(statusesTask, severitiesTask, processesTask, usersTask);

        var validStatuses = new HashSet<string>((await statusesTask).Select(s => s.Name), StringComparer.OrdinalIgnoreCase);
        var validSeverities = new HashSet<string>((await severitiesTask).Select(s => s.Name), StringComparer.OrdinalIgnoreCase);

        // Process lookups: name → id, id set
        var processes = await processesTask;
        var processNameToId = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var p in processes) processNameToId.TryAdd(p.Name, p.Id);
        var processIds = new HashSet<string>(processes.Select(p => p.Id), StringComparer.OrdinalIgnoreCase);

        // User lookups: accept Emp ID, Email, or Name (name must be unique)
        var users = (await usersTask).ToList();
        var userIds = new HashSet<string>(users.Select(u => u.Id), StringComparer.OrdinalIgnoreCase);
        var userEmails = new HashSet<string>(
            users.Where(u => !string.IsNullOrWhiteSpace(u.Email)).Select(u => u.Email!),
            StringComparer.OrdinalIgnoreCase);
        var userNameCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var u in users)
        {
            userNameCounts.TryGetValue(u.Name, out var count);
            userNameCounts[u.Name] = count + 1;
        }

        using var reader = new StreamReader(csvStream);
        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HeaderValidated = null,
            MissingFieldFound = null,
            TrimOptions = TrimOptions.Trim,
        });

        csv.Context.RegisterClassMap<CsvIssueRowMap>();
        var records = csv.GetRecords<CsvIssueRow>().ToList();

        var createdIds = new List<int>();
        var failedRows = new List<BulkUploadRowError>();
        var rowNumber = 1; // 1-based (header is row 0)

        foreach (var row in records)
        {
            rowNumber++;

            // Skip completely empty rows
            if (string.IsNullOrWhiteSpace(row.IssueDescription) &&
                string.IsNullOrWhiteSpace(row.Module) &&
                string.IsNullOrWhiteSpace(row.AssignedTo))
                continue;

            var errors = ValidateRow(row, validStatuses, validSeverities, processNameToId, processIds, userIds, userEmails, userNameCounts);
            if (errors.Count > 0)
            {
                failedRows.Add(new BulkUploadRowError(rowNumber, row.SrNumber, errors, CsvRowToDict(row)));
                continue;
            }

            var request = MapRowToRequest(row, validSeverities, processNameToId, processIds);
            var issueId = await CreateAsync(request);

            // If CSV status is not "New", update status after creation
            var csvStatus = NormalizeEnumValue(row.Status, validStatuses);
            if (!string.IsNullOrWhiteSpace(csvStatus) &&
                !csvStatus.Equals("New", StringComparison.OrdinalIgnoreCase))
            {
                await UpdateAsync(issueId, new UpdateIssueRequest(
                    IssueTitle: null, IssueDescription: null,
                    Status: csvStatus, AssignedTo: null,
                    AssigningDate: null, DueDate: null, Severity: null
                ));
            }

            createdIds.Add(issueId);
        }

        return new BulkUploadResult(
            TotalRows: rowNumber - 1,
            SuccessCount: createdIds.Count,
            FailedCount: failedRows.Count,
            CreatedIssueIds: createdIds,
            FailedRows: failedRows
        );
    }

    private static List<string> ValidateRow(
        CsvIssueRow row,
        HashSet<string> validStatuses,
        HashSet<string> validSeverities,
        Dictionary<string, string> processNameToId,
        HashSet<string> processIds,
        HashSet<string> userIds,
        HashSet<string> userEmails,
        Dictionary<string, int> userNameCounts)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(row.IssueDescription))
            errors.Add("Issue Description is required");
        if (string.IsNullOrWhiteSpace(row.Module))
            errors.Add("Module is required");
        if (string.IsNullOrWhiteSpace(row.RaisedBy))
            errors.Add("Raised By is required");

        // Date validation — at least one date must be parseable
        var hasDate = TryParseDate(row.RaisedOn, out _) || TryParseDate(row.IssueDate, out _);
        if (!hasDate)
            errors.Add("A valid date is required (Raised On or Issue Date)");

        // Status validation (strict)
        if (!string.IsNullOrWhiteSpace(row.Status) &&
            NormalizeEnumValue(row.Status, validStatuses) is null)
            errors.Add($"Invalid Status: '{row.Status}'. Must be one of: {string.Join(", ", validStatuses)}");

        // Severity validation (strict, but blank defaults to Medium)
        if (!string.IsNullOrWhiteSpace(row.Severity) &&
            NormalizeEnumValue(row.Severity, validSeverities) is null)
            errors.Add($"Invalid Severity: '{row.Severity}'. Must be one of: {string.Join(", ", validSeverities)}");

        // Module/Process validation (strict — must exist in master)
        if (!string.IsNullOrWhiteSpace(row.Module) &&
            !processNameToId.ContainsKey(row.Module) &&
            !processIds.Contains(row.Module))
            errors.Add($"Invalid Module: '{row.Module}'. Must match an active process name or ID.");

        // Screen Name is free-text (not validated against MasterTasks)

        // RaisedBy validation: accept Emp ID, Email, or unique Name
        if (!string.IsNullOrWhiteSpace(row.RaisedBy))
            ValidateUserRef(row.RaisedBy, "Raised By", userIds, userEmails, userNameCounts, errors);

        // AssignedTo validation: same logic, but optional field
        if (!string.IsNullOrWhiteSpace(row.AssignedTo))
            ValidateUserRef(row.AssignedTo, "Assigned To", userIds, userEmails, userNameCounts, errors);

        // Due date validation
        if (!string.IsNullOrWhiteSpace(row.DueDate) && !TryParseDate(row.DueDate, out _))
            errors.Add($"Invalid Due Date format: '{row.DueDate}'");

        // Resolved date validation
        if (!string.IsNullOrWhiteSpace(row.ResolvedOn) && !TryParseDate(row.ResolvedOn, out _))
            errors.Add($"Invalid Resolved Date format: '{row.ResolvedOn}'");

        return errors;
    }

    private static void ValidateUserRef(
        string value, string fieldName,
        HashSet<string> userIds,
        HashSet<string> userEmails,
        Dictionary<string, int> userNameCounts,
        List<string> errors)
    {
        // 1. Exact match on Emp ID — always unambiguous
        if (userIds.Contains(value)) return;

        // 2. Exact match on Email — always unambiguous
        if (userEmails.Contains(value)) return;

        // 3. Match by name — must resolve to exactly one user
        if (userNameCounts.TryGetValue(value, out var count))
        {
            if (count > 1)
                errors.Add($"Ambiguous {fieldName}: '{value}' matches {count} users. Use Emp ID or Email instead.");
            return; // count == 1 → valid
        }

        errors.Add($"Invalid {fieldName}: '{value}'. User not found (checked Emp ID, Email, and Name).");
    }

    private static CreateIssueRequest MapRowToRequest(
        CsvIssueRow row,
        HashSet<string> validSeverities,
        Dictionary<string, string> processNameToId,
        HashSet<string> processIds)
    {
        TryParseDate(row.RaisedOn, out var raisedDate);
        TryParseDate(row.IssueDate, out var issueDate);
        TryParseDate(row.DueDate, out var dueDate);

        var finalDate = issueDate != default ? issueDate : raisedDate;

        var title = row.IssueDescription?.Length > 500
            ? row.IssueDescription[..500]
            : row.IssueDescription ?? string.Empty;

        var description = row.IssueDescription ?? string.Empty;
        if (!string.IsNullOrWhiteSpace(row.ScreenName))
            description = $"[{row.ScreenName}] {description}";
        if (!string.IsNullOrWhiteSpace(row.Comments))
            description += "\n\nComments: " + row.Comments;

        var severity = NormalizeEnumValue(row.Severity, validSeverities) ?? "Medium";

        // Resolve Module name → processId (accept both name and direct ID)
        var processId = processNameToId.GetValueOrDefault(row.Module ?? "")
            ?? (processIds.Contains(row.Module ?? "") ? row.Module! : string.Empty);

        return new CreateIssueRequest(
            ProcessId: processId,
            TaskId: string.Empty,
            IssueDate: finalDate,
            IssueRaisedBy: row.RaisedBy ?? string.Empty,
            IssueTitle: title,
            IssueDescription: description,
            Severity: severity,
            AssignedTo: row.AssignedTo ?? string.Empty,
            AssigningDate: null,
            DueDate: dueDate != default ? dueDate : null,
            DependentProcesses: [],
            Attachments: []
        );
    }

    private static string? NormalizeEnumValue(string? value, HashSet<string> validValues)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        // Find exact case-insensitive match
        return validValues.FirstOrDefault(v => v.Equals(value.Trim(), StringComparison.OrdinalIgnoreCase));
    }

    private static bool TryParseDate(string? value, out DateTime result)
    {
        result = default;
        if (string.IsNullOrWhiteSpace(value)) return false;
        return DateTime.TryParseExact(value.Trim(), DateFormats, CultureInfo.InvariantCulture,
            DateTimeStyles.None, out result);
    }

    // ── Helpers ──

    private static Dictionary<string, string?> CsvRowToDict(CsvIssueRow row) => new()
    {
        ["SR#"] = row.SrNumber,
        ["Issue Description"] = row.IssueDescription,
        ["Raised By"] = row.RaisedBy,
        ["Raised On"] = row.RaisedOn,
        ["Module"] = row.Module,
        ["Screen Name"] = row.ScreenName,
        ["Type of Issue"] = row.TypeOfIssue,
        ["Severity"] = row.Severity,
        ["Status"] = row.Status,
        ["Resolved On"] = row.ResolvedOn,
        ["Comments"] = row.Comments,
        ["Assigned To"] = row.AssignedTo,
        ["Issue Date"] = row.IssueDate,
        ["Due Date"] = row.DueDate,
    };

    private static string BuildChangesJson(List<FieldChange> changes)
    {
        return JsonSerializer.Serialize(changes, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        });
    }
}

// Simple record for serialization
public record FieldChange(string Field, string? From, string? To);

// ── CSV Mapping ──

public class CsvIssueRow
{
    public string? SrNumber { get; set; }
    public string? IssueDescription { get; set; }
    public string? RaisedBy { get; set; }
    public string? RaisedOn { get; set; }
    public string? Module { get; set; }
    public string? ScreenName { get; set; }
    public string? TypeOfIssue { get; set; }
    public string? Severity { get; set; }
    public string? Status { get; set; }
    public string? ResolvedOn { get; set; }
    public string? Comments { get; set; }
    public string? AssignedTo { get; set; }
    public string? IssueDate { get; set; }
    public string? DueDate { get; set; }
}

public sealed class CsvIssueRowMap : ClassMap<CsvIssueRow>
{
    public CsvIssueRowMap()
    {
        Map(m => m.SrNumber).Name("SR#");
        Map(m => m.IssueDescription).Name("Issue Description", "Actions");
        Map(m => m.RaisedBy).Name("Raised By");
        Map(m => m.RaisedOn).Name("Raised On");
        Map(m => m.Module).Name("Module");
        Map(m => m.ScreenName).Name("Screen Name");
        Map(m => m.TypeOfIssue).Name("Type of Issue", "Category");
        Map(m => m.Severity).Name("Severity");
        Map(m => m.Status).Name("Status");
        Map(m => m.ResolvedOn).Name("Resolved On", "Resolved Date");
        Map(m => m.Comments).Name("Comments");
        Map(m => m.AssignedTo).Name("Assigned To", "Asigned to", "Responsibility");
        Map(m => m.IssueDate).Name("Issue Date");
        Map(m => m.DueDate).Name("Due Date", "Due date to close", "Due Date to close");
    }
}
