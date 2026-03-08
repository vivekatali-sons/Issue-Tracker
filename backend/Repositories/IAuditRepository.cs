using DMS.API.Models;

namespace DMS.API.Repositories;

public interface IAuditRepository
{
    Task<int> InsertAsync(AuditLog entry);
    Task<IEnumerable<AuditLog>> GetLogsAsync(string? entityType = null, int? entityId = null, string? userId = null, string? action = null, int pageSize = 50, int page = 1);
    Task<IEnumerable<AuditLog>> GetByIssueAsync(int issueId);
    Task<IEnumerable<Issue>> GetDeletedIssuesAsync();
    Task RestoreIssueAsync(int id);
    Task HardDeleteIssueAsync(int id);
}
