using DMS.API.Models;

namespace DMS.API.Repositories;

public interface IAdminRepository
{
    // Auth
    Task<AdminCredential?> GetAdminByUsernameAsync(string username);

    // Statuses
    Task<IEnumerable<AdminMasterStatus>> GetAllStatusesAsync();
    Task<int> CreateStatusAsync(CreateStatusRequest req);
    Task UpdateStatusAsync(int id, UpdateStatusRequest req);
    Task ToggleStatusActiveAsync(int id);

    // Severities
    Task<IEnumerable<AdminMasterSeverity>> GetAllSeveritiesAsync();
    Task<int> CreateSeverityAsync(CreateSeverityRequest req);
    Task UpdateSeverityAsync(int id, UpdateSeverityRequest req);
    Task ToggleSeverityActiveAsync(int id);

    // Processes
    Task<IEnumerable<AdminMasterProcess>> GetAllProcessesAsync();
    Task CreateProcessAsync(CreateProcessRequest req);
    Task UpdateProcessAsync(string id, UpdateProcessRequest req);
    Task ToggleProcessActiveAsync(string id);

    // Tasks
    Task<IEnumerable<AdminMasterTask>> GetAllTasksAsync();
    Task CreateTaskAsync(CreateTaskRequest req);
    Task UpdateTaskAsync(string id, UpdateTaskRequest req);
    Task ToggleTaskActiveAsync(string id);

    // Users
    Task<IEnumerable<AdminMasterUser>> GetAllUsersAsync();
    Task CreateUserAsync(CreateUserRequest req);
    Task UpdateUserAsync(string id, UpdateUserRequest req);
    Task ToggleUserActiveAsync(string id);

    // Permissions
    Task<IEnumerable<UserPermission>> GetAllUserPermissionsAsync();
    Task<UserPermission?> GetUserPermissionsAsync(string userId);
    Task UpsertUserPermissionsAsync(string userId, UpdateUserPermissionsRequest req);

    // Ensure User (auto-registration)
    Task<EnsureUserResponse?> EnsureUserAsync(EnsureUserRequest req);

    // Get user by ID (for admin enter-app)
    Task<EnsureUserResponse?> GetUserByIdAsync(string userId);
}
