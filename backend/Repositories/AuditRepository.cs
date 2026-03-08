using System.Data;
using Dapper;
using DMS.API.Data;
using DMS.API.Models;

namespace DMS.API.Repositories;

public class AuditRepository(IDbConnectionFactory connectionFactory) : IAuditRepository
{
    private IDbConnection Db() => connectionFactory.CreateConnection();

    public async Task<int> InsertAsync(AuditLog entry)
    {
        using var db = Db();
        return await db.ExecuteScalarAsync<int>(
            "sp_InsertAuditLog",
            new
            {
                entry.Action,
                entry.EntityType,
                entry.EntityId,
                entry.UserId,
                entry.Details,
                entry.IpAddress
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<IEnumerable<AuditLog>> GetLogsAsync(
        string? entityType = null, int? entityId = null,
        string? userId = null, string? action = null,
        int pageSize = 50, int page = 1)
    {
        using var db = Db();
        return await db.QueryAsync<AuditLog>(
            "sp_GetAuditLogs",
            new { EntityType = entityType, EntityId = entityId, UserId = userId, Action = action, PageSize = pageSize, Page = page },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<IEnumerable<AuditLog>> GetByIssueAsync(int issueId)
    {
        using var db = Db();
        return await db.QueryAsync<AuditLog>(
            "sp_GetAuditLogsByIssue",
            new { IssueId = issueId },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<IEnumerable<Issue>> GetDeletedIssuesAsync()
    {
        using var db = Db();
        return await db.QueryAsync<Issue>(
            "sp_GetDeletedIssues",
            commandType: CommandType.StoredProcedure);
    }

    public async Task RestoreIssueAsync(int id)
    {
        using var db = Db();
        await db.ExecuteAsync(
            "sp_RestoreIssue",
            new { Id = id },
            commandType: CommandType.StoredProcedure);
    }

    public async Task HardDeleteIssueAsync(int id)
    {
        using var db = Db();
        await db.ExecuteAsync(
            "sp_HardDeleteIssue",
            new { Id = id },
            commandType: CommandType.StoredProcedure);
    }
}
