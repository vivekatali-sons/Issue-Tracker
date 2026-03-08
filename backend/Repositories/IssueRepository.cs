using System.Data;
using Dapper;
using DMS.API.Data;
using DMS.API.Models;

namespace DMS.API.Repositories;

public class IssueRepository(IDbConnectionFactory connectionFactory) : IIssueRepository
{
    private IDbConnection Db() => connectionFactory.CreateConnection();

    // ── Issues ──

    public async Task<IEnumerable<Issue>> GetAllAsync()
    {
        using var db = Db();
        return await db.QueryAsync<Issue>(
            "sp_GetAllIssues",
            commandType: CommandType.StoredProcedure);
    }

    public async Task<Issue?> GetByIdAsync(int id)
    {
        using var db = Db();
        return await db.QuerySingleOrDefaultAsync<Issue>(
            "sp_GetIssueById",
            new { Id = id },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<int> CreateAsync(Issue issue)
    {
        using var db = Db();
        return await db.ExecuteScalarAsync<int>(
            "sp_CreateIssue",
            new
            {
                issue.ProcessId,
                issue.TaskId,
                issue.IssueDate,
                issue.IssueRaisedBy,
                issue.IssueTitle,
                issue.IssueDescription,
                issue.Status,
                issue.Severity,
                issue.AssignedTo,
                issue.AssigningDate,
                issue.DueDate,
                issue.CurrentVersion,
                issue.ReopenCount
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task UpdateAsync(Issue issue)
    {
        using var db = Db();
        await db.ExecuteAsync(
            "sp_UpdateIssue",
            new
            {
                issue.Id,
                issue.IssueTitle,
                issue.IssueDescription,
                issue.Status,
                issue.Severity,
                issue.AssignedTo,
                issue.AssigningDate,
                issue.DueDate,
                issue.CurrentVersion,
                issue.ReopenCount,
                issue.ProcessId,
                issue.TaskId
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task DeleteAsync(int id, string? deletedBy = null)
    {
        using var db = Db();
        await db.ExecuteAsync(
            "sp_DeleteIssue",
            new { Id = id, DeletedBy = deletedBy },
            commandType: CommandType.StoredProcedure);
    }

    // ── Dependent Processes ──

    public async Task SetDependentProcessesAsync(int issueId, List<string> processIds)
    {
        using var db = Db();
        await db.ExecuteAsync(
            "sp_DeleteDependentProcesses",
            new { IssueId = issueId },
            commandType: CommandType.StoredProcedure);

        foreach (var processId in processIds)
        {
            await db.ExecuteAsync(
                "sp_AddDependentProcess",
                new { IssueId = issueId, ProcessId = processId },
                commandType: CommandType.StoredProcedure);
        }
    }

    public async Task<List<string>> GetDependentProcessesAsync(int issueId)
    {
        using var db = Db();
        var results = await db.QueryAsync<string>(
            "sp_GetDependentProcesses",
            new { IssueId = issueId },
            commandType: CommandType.StoredProcedure);
        return results.ToList();
    }

    // ── Attachments ──

    public async Task AddAttachmentsAsync(int issueId, List<FileAttachment> attachments)
    {
        if (attachments.Count == 0) return;

        using var db = Db();
        foreach (var a in attachments)
        {
            await db.ExecuteAsync(
                "sp_AddAttachment",
                new
                {
                    IssueId = issueId,
                    a.FileName,
                    a.FileSize,
                    a.ContentType,
                    a.DataUrl
                },
                commandType: CommandType.StoredProcedure);
        }
    }

    public async Task<List<FileAttachment>> GetAttachmentsAsync(int issueId)
    {
        using var db = Db();
        var results = await db.QueryAsync<FileAttachment>(
            "sp_GetAttachments",
            new { IssueId = issueId },
            commandType: CommandType.StoredProcedure);
        return results.ToList();
    }

    // ── Versions ──

    public async Task<int> AddVersionAsync(IssueVersion version)
    {
        using var db = Db();
        return await db.ExecuteScalarAsync<int>(
            "sp_AddVersion",
            new
            {
                version.IssueId,
                version.VersionNumber,
                version.AssignedTo,
                version.AssigningDate,
                version.DueDate,
                version.Status,
                version.ReopenReason,
                version.ChangesSummary,
                version.ModifiedBy
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<List<IssueVersion>> GetVersionsAsync(int issueId)
    {
        using var db = Db();
        var results = await db.QueryAsync<IssueVersion>(
            "sp_GetVersions",
            new { IssueId = issueId },
            commandType: CommandType.StoredProcedure);
        return results.ToList();
    }

    // ── Resolutions ──

    public async Task<int> AddResolutionAsync(Resolution resolution)
    {
        using var db = Db();
        return await db.ExecuteScalarAsync<int>(
            "sp_AddResolution",
            new
            {
                resolution.IssueId,
                resolution.VersionNumber,
                resolution.ResolvedBy,
                resolution.ResolutionNotes,
                resolution.RootCause,
                resolution.PreventiveMeasures,
                resolution.VerificationDate
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<Resolution?> GetLatestResolutionAsync(int issueId)
    {
        using var db = Db();
        return await db.QuerySingleOrDefaultAsync<Resolution>(
            "sp_GetLatestResolution",
            new { IssueId = issueId },
            commandType: CommandType.StoredProcedure);
    }

    public async Task AddResolutionTestersAsync(int resolutionId, List<string> userIds)
    {
        if (userIds.Count == 0) return;

        using var db = Db();
        foreach (var userId in userIds)
        {
            await db.ExecuteAsync(
                "sp_AddResolutionTester",
                new { ResolutionId = resolutionId, UserId = userId },
                commandType: CommandType.StoredProcedure);
        }
    }

    public async Task<int> AddDepTestResultAsync(DependentProcessTestResult result)
    {
        using var db = Db();
        return await db.ExecuteScalarAsync<int>(
            "sp_AddDepTestResult",
            new
            {
                result.ResolutionId,
                result.VersionId,
                result.ProcessId,
                result.Tested,
                result.TestDate
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task AddTestResultTestersAsync(int testResultId, List<string> userIds)
    {
        if (userIds.Count == 0) return;

        using var db = Db();
        foreach (var userId in userIds)
        {
            await db.ExecuteAsync(
                "sp_AddTestResultTester",
                new { TestResultId = testResultId, UserId = userId },
                commandType: CommandType.StoredProcedure);
        }
    }

    public async Task<List<DependentProcessTestResult>> GetDepTestResultsForResolutionAsync(int resolutionId)
    {
        using var db = Db();
        var results = await db.QueryAsync<DependentProcessTestResult>(
            "sp_GetDepTestResults",
            new { ResolutionId = resolutionId },
            commandType: CommandType.StoredProcedure);

        // Load testers for each result
        foreach (var r in results)
        {
            var testers = await db.QueryAsync<string>(
                "sp_GetTestResultTesters",
                new { TestResultId = r.Id },
                commandType: CommandType.StoredProcedure);
            r.TestedBy = testers.ToList();
        }

        return results.ToList();
    }

    public async Task<List<string>> GetResolutionTestersAsync(int resolutionId)
    {
        using var db = Db();
        var results = await db.QueryAsync<string>(
            "sp_GetResolutionTesters",
            new { ResolutionId = resolutionId },
            commandType: CommandType.StoredProcedure);
        return results.ToList();
    }
}
