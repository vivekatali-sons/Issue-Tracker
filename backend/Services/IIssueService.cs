using DMS.API.Models;

namespace DMS.API.Services;

public interface IIssueService
{
    Task<IEnumerable<IssueListItem>> GetAllAsync();
    Task<IssueDetailResponse?> GetByIdAsync(int id);
    Task<int> CreateAsync(CreateIssueRequest request);
    Task UpdateAsync(int id, UpdateIssueRequest request);
    Task DeleteAsync(int id, string? deletedBy = null);
    Task ResolveAsync(int id, ResolveIssueRequest request);
    Task ReopenAsync(int id, ReopenIssueRequest request);
    Task<BulkUploadResult> BulkCreateFromCsvAsync(Stream csvStream);
}
