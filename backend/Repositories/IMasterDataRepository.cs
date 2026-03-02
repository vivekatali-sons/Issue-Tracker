using DMS.API.Models;

namespace DMS.API.Repositories;

public interface IMasterDataRepository
{
    Task<List<MasterStatus>> GetStatusesAsync();
    Task<List<MasterSeverity>> GetSeveritiesAsync();
    Task<List<MasterProcess>> GetProcessesAsync();
    Task<List<MasterTask>> GetTasksAsync();
    Task<List<MasterUser>> GetUsersAsync();
}
