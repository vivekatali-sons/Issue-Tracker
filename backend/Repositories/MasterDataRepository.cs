using System.Data;
using Dapper;
using DMS.API.Data;
using DMS.API.Models;

namespace DMS.API.Repositories;

public class MasterDataRepository(IDbConnectionFactory connectionFactory) : IMasterDataRepository
{
    private IDbConnection Db() => connectionFactory.CreateConnection();

    public async Task<List<MasterStatus>> GetStatusesAsync()
    {
        using var db = Db();
        var results = await db.QueryAsync<MasterStatus>(
            "sp_GetMasterStatuses",
            commandType: CommandType.StoredProcedure);
        return results.ToList();
    }

    public async Task<List<MasterSeverity>> GetSeveritiesAsync()
    {
        using var db = Db();
        var results = await db.QueryAsync<MasterSeverity>(
            "sp_GetMasterSeverities",
            commandType: CommandType.StoredProcedure);
        return results.ToList();
    }

    public async Task<List<MasterProcess>> GetProcessesAsync()
    {
        using var db = Db();
        var results = await db.QueryAsync<MasterProcess>(
            "sp_GetMasterProcesses",
            commandType: CommandType.StoredProcedure);
        return results.ToList();
    }

    public async Task<List<MasterTask>> GetTasksAsync()
    {
        using var db = Db();
        var results = await db.QueryAsync<MasterTask>(
            "sp_GetMasterTasks",
            commandType: CommandType.StoredProcedure);
        return results.ToList();
    }

    public async Task<List<MasterUser>> GetUsersAsync()
    {
        using var db = Db();
        var results = await db.QueryAsync<MasterUser>(
            "sp_GetMasterUsers",
            commandType: CommandType.StoredProcedure);
        return results.ToList();
    }
}
