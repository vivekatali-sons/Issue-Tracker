using DMS.API.Models;

namespace DMS.API.Services;

public interface IMasterDataService
{
    Task<MasterDataResponse> GetAllAsync();
    Task<List<MasterStatus>> GetStatusesAsync();
    Task<List<MasterSeverity>> GetSeveritiesAsync();
    Task<List<MasterProcess>> GetProcessesAsync();
    Task<List<MasterTask>> GetTasksAsync();
    Task<List<MasterUser>> GetUsersAsync();
}
