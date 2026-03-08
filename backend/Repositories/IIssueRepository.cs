using DMS.API.Models;

namespace DMS.API.Repositories;

public interface IIssueRepository
{
    Task<IEnumerable<Issue>> GetAllAsync();
    Task<Issue?> GetByIdAsync(int id);
    Task<int> CreateAsync(Issue issue);
    Task UpdateAsync(Issue issue);
    Task DeleteAsync(int id, string? deletedBy = null);

    // Dependent processes
    Task SetDependentProcessesAsync(int issueId, List<string> processIds);
    Task<List<string>> GetDependentProcessesAsync(int issueId);

    // Attachments
    Task AddAttachmentsAsync(int issueId, List<FileAttachment> attachments);
    Task<List<FileAttachment>> GetAttachmentsAsync(int issueId);

    // Versions
    Task<int> AddVersionAsync(IssueVersion version);
    Task<List<IssueVersion>> GetVersionsAsync(int issueId);

    // Resolutions
    Task<int> AddResolutionAsync(Resolution resolution);
    Task<Resolution?> GetLatestResolutionAsync(int issueId);
    Task AddResolutionTestersAsync(int resolutionId, List<string> userIds);
    Task<int> AddDepTestResultAsync(DependentProcessTestResult result);
    Task AddTestResultTestersAsync(int testResultId, List<string> userIds);
    Task<List<DependentProcessTestResult>> GetDepTestResultsForResolutionAsync(int resolutionId);
    Task<List<string>> GetResolutionTestersAsync(int resolutionId);
}
