using System.Data;
using Dapper;
using DMS.API.Data;
using DMS.API.Models;

namespace DMS.API.Repositories;

public class AdminRepository(IDbConnectionFactory connectionFactory) : IAdminRepository
{
    // ── Auth ──

    public async Task<AdminCredential?> GetAdminByUsernameAsync(string username)
    {
        using var conn = connectionFactory.CreateConnection();
        return await conn.QueryFirstOrDefaultAsync<AdminCredential>(
            "sp_GetAdminByUsername", new { Username = username }, commandType: CommandType.StoredProcedure);
    }

    // ── Statuses ──

    public async Task<IEnumerable<AdminMasterStatus>> GetAllStatusesAsync()
    {
        using var conn = connectionFactory.CreateConnection();
        return await conn.QueryAsync<AdminMasterStatus>(
            "sp_GetAllMasterStatuses", commandType: CommandType.StoredProcedure);
    }

    public async Task<int> CreateStatusAsync(CreateStatusRequest req)
    {
        using var conn = connectionFactory.CreateConnection();
        return await conn.ExecuteScalarAsync<int>(
            "sp_CreateMasterStatus", new { req.Name, req.Label, req.TextColor, req.BgColor, req.ChartColor, req.DisplayOrder },
            commandType: CommandType.StoredProcedure);
    }

    public async Task UpdateStatusAsync(int id, UpdateStatusRequest req)
    {
        using var conn = connectionFactory.CreateConnection();
        await conn.ExecuteAsync(
            "sp_UpdateMasterStatus", new { Id = id, req.Name, req.Label, req.TextColor, req.BgColor, req.ChartColor, req.DisplayOrder },
            commandType: CommandType.StoredProcedure);
    }

    public async Task ToggleStatusActiveAsync(int id)
    {
        using var conn = connectionFactory.CreateConnection();
        await conn.ExecuteAsync("sp_ToggleMasterStatusActive", new { Id = id }, commandType: CommandType.StoredProcedure);
    }

    // ── Severities ──

    public async Task<IEnumerable<AdminMasterSeverity>> GetAllSeveritiesAsync()
    {
        using var conn = connectionFactory.CreateConnection();
        return await conn.QueryAsync<AdminMasterSeverity>(
            "sp_GetAllMasterSeverities", commandType: CommandType.StoredProcedure);
    }

    public async Task<int> CreateSeverityAsync(CreateSeverityRequest req)
    {
        using var conn = connectionFactory.CreateConnection();
        return await conn.ExecuteScalarAsync<int>(
            "sp_CreateMasterSeverity", new { req.Name, req.Label, req.TextColor, req.BgColor, req.DisplayOrder },
            commandType: CommandType.StoredProcedure);
    }

    public async Task UpdateSeverityAsync(int id, UpdateSeverityRequest req)
    {
        using var conn = connectionFactory.CreateConnection();
        await conn.ExecuteAsync(
            "sp_UpdateMasterSeverity", new { Id = id, req.Name, req.Label, req.TextColor, req.BgColor, req.DisplayOrder },
            commandType: CommandType.StoredProcedure);
    }

    public async Task ToggleSeverityActiveAsync(int id)
    {
        using var conn = connectionFactory.CreateConnection();
        await conn.ExecuteAsync("sp_ToggleMasterSeverityActive", new { Id = id }, commandType: CommandType.StoredProcedure);
    }

    // ── Processes ──

    public async Task<IEnumerable<AdminMasterProcess>> GetAllProcessesAsync()
    {
        using var conn = connectionFactory.CreateConnection();
        return await conn.QueryAsync<AdminMasterProcess>(
            "sp_GetAllMasterProcesses", commandType: CommandType.StoredProcedure);
    }

    public async Task CreateProcessAsync(CreateProcessRequest req)
    {
        using var conn = connectionFactory.CreateConnection();
        await conn.ExecuteAsync(
            "sp_CreateMasterProcess", new { req.Id, req.Name, req.Description, req.DisplayOrder },
            commandType: CommandType.StoredProcedure);
    }

    public async Task UpdateProcessAsync(string id, UpdateProcessRequest req)
    {
        using var conn = connectionFactory.CreateConnection();
        await conn.ExecuteAsync(
            "sp_UpdateMasterProcess", new { Id = id, req.Name, req.Description, req.DisplayOrder },
            commandType: CommandType.StoredProcedure);
    }

    public async Task ToggleProcessActiveAsync(string id)
    {
        using var conn = connectionFactory.CreateConnection();
        await conn.ExecuteAsync("sp_ToggleMasterProcessActive", new { Id = id }, commandType: CommandType.StoredProcedure);
    }

    // ── Tasks ──

    public async Task<IEnumerable<AdminMasterTask>> GetAllTasksAsync()
    {
        using var conn = connectionFactory.CreateConnection();
        return await conn.QueryAsync<AdminMasterTask>(
            "sp_GetAllMasterTasks", commandType: CommandType.StoredProcedure);
    }

    public async Task CreateTaskAsync(CreateTaskRequest req)
    {
        using var conn = connectionFactory.CreateConnection();
        await conn.ExecuteAsync(
            "sp_CreateMasterTask", new { req.Id, req.Name, req.ProcessId, req.DisplayOrder },
            commandType: CommandType.StoredProcedure);
    }

    public async Task UpdateTaskAsync(string id, UpdateTaskRequest req)
    {
        using var conn = connectionFactory.CreateConnection();
        await conn.ExecuteAsync(
            "sp_UpdateMasterTask", new { Id = id, req.Name, req.ProcessId, req.DisplayOrder },
            commandType: CommandType.StoredProcedure);
    }

    public async Task ToggleTaskActiveAsync(string id)
    {
        using var conn = connectionFactory.CreateConnection();
        await conn.ExecuteAsync("sp_ToggleMasterTaskActive", new { Id = id }, commandType: CommandType.StoredProcedure);
    }

    // ── Users ──

    public async Task<IEnumerable<AdminMasterUser>> GetAllUsersAsync()
    {
        using var conn = connectionFactory.CreateConnection();
        return await conn.QueryAsync<AdminMasterUser>(
            "sp_GetAllMasterUsers", commandType: CommandType.StoredProcedure);
    }

    public async Task CreateUserAsync(CreateUserRequest req)
    {
        using var conn = connectionFactory.CreateConnection();
        await conn.ExecuteAsync(
            "sp_CreateMasterUser", new { req.Id, req.Name, req.Email, req.DisplayOrder },
            commandType: CommandType.StoredProcedure);
    }

    public async Task UpdateUserAsync(string id, UpdateUserRequest req)
    {
        using var conn = connectionFactory.CreateConnection();
        await conn.ExecuteAsync(
            "sp_UpdateMasterUser", new { Id = id, req.Name, req.Email, req.DisplayOrder },
            commandType: CommandType.StoredProcedure);
    }

    public async Task ToggleUserActiveAsync(string id)
    {
        using var conn = connectionFactory.CreateConnection();
        await conn.ExecuteAsync("sp_ToggleMasterUserActive", new { Id = id }, commandType: CommandType.StoredProcedure);
    }

    // ── Permissions ──

    public async Task<IEnumerable<UserPermission>> GetAllUserPermissionsAsync()
    {
        using var conn = connectionFactory.CreateConnection();
        return await conn.QueryAsync<UserPermission>(
            "sp_GetAllUserPermissions", commandType: CommandType.StoredProcedure);
    }

    public async Task<UserPermission?> GetUserPermissionsAsync(string userId)
    {
        using var conn = connectionFactory.CreateConnection();
        return await conn.QueryFirstOrDefaultAsync<UserPermission>(
            "sp_GetUserPermissions", new { UserId = userId }, commandType: CommandType.StoredProcedure);
    }

    public async Task UpsertUserPermissionsAsync(string userId, UpdateUserPermissionsRequest req)
    {
        using var conn = connectionFactory.CreateConnection();
        await conn.ExecuteAsync("sp_UpsertUserPermissions", new
        {
            UserId = userId,
            req.CanCreateIssue, req.CanEditIssue, req.CanResolveIssue,
            req.CanBulkUpload, req.CanAccessAdmin, req.IsBlocked,
        }, commandType: CommandType.StoredProcedure);
    }

    // ── Ensure User (auto-registration) ──

    public async Task<EnsureUserResponse?> EnsureUserAsync(EnsureUserRequest req)
    {
        using var conn = connectionFactory.CreateConnection();
        return await conn.QueryFirstOrDefaultAsync<EnsureUserResponse>(
            "sp_EnsureUser", new { UserId = req.Id, req.Name, req.Email },
            commandType: CommandType.StoredProcedure);
    }

    // ── Get User by ID (for admin enter-app) ──

    public async Task<EnsureUserResponse?> GetUserByIdAsync(string userId)
    {
        using var conn = connectionFactory.CreateConnection();
        return await conn.QueryFirstOrDefaultAsync<EnsureUserResponse>(
            "sp_GetUserById", new { UserId = userId }, commandType: CommandType.StoredProcedure);
    }
}
