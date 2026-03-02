using DMS.API.Models;
using DMS.API.Repositories;

namespace DMS.API.Services;

public class MasterDataService(IMasterDataRepository repo) : IMasterDataService
{
    public async Task<MasterDataResponse> GetAllAsync()
    {
        var statusesTask = repo.GetStatusesAsync();
        var severitiesTask = repo.GetSeveritiesAsync();
        var processesTask = repo.GetProcessesAsync();
        var tasksTask = repo.GetTasksAsync();
        var usersTask = repo.GetUsersAsync();

        await Task.WhenAll(statusesTask, severitiesTask, processesTask, tasksTask, usersTask);

        return new MasterDataResponse(
            statusesTask.Result,
            severitiesTask.Result,
            processesTask.Result,
            tasksTask.Result,
            usersTask.Result
        );
    }

    public Task<List<MasterStatus>> GetStatusesAsync() => repo.GetStatusesAsync();
    public Task<List<MasterSeverity>> GetSeveritiesAsync() => repo.GetSeveritiesAsync();
    public Task<List<MasterProcess>> GetProcessesAsync() => repo.GetProcessesAsync();
    public Task<List<MasterTask>> GetTasksAsync() => repo.GetTasksAsync();
    public Task<List<MasterUser>> GetUsersAsync() => repo.GetUsersAsync();
}
