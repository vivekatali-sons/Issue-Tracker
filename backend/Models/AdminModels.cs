namespace DMS.API.Models;

// ── Admin Auth ──

public class AdminCredential
{
    public int Id { get; set; }
    public string Username { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}

public record AdminLoginRequest(string Username, string Password);
public record AdminLoginResponse(string Token, string Username);

// ── User Permissions ──

public class UserPermission
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public string UserName { get; set; } = "";
    public string UserEmail { get; set; } = "";
    public bool CanCreateIssue { get; set; }
    public bool CanEditIssue { get; set; }
    public bool CanResolveIssue { get; set; }
    public bool CanBulkUpload { get; set; }
    public bool CanAccessAdmin { get; set; }
    public bool IsBlocked { get; set; }
}

public record UpdateUserPermissionsRequest(
    bool CanCreateIssue, bool CanEditIssue, bool CanResolveIssue,
    bool CanBulkUpload, bool CanAccessAdmin, bool IsBlocked);

// ── Admin Master Data Models (include IsActive for admin view) ──

public class AdminMasterStatus
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Label { get; set; } = "";
    public string TextColor { get; set; } = "";
    public string BgColor { get; set; } = "";
    public string ChartColor { get; set; } = "";
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
}

public class AdminMasterSeverity
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Label { get; set; } = "";
    public string TextColor { get; set; } = "";
    public string BgColor { get; set; } = "";
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
}

public class AdminMasterProcess
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
}

public class AdminMasterTask
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string ProcessId { get; set; } = "";
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
}

public class AdminMasterUser
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public int IssuesRaised { get; set; }
}

// ── Create/Update DTOs ──

public record CreateStatusRequest(string Name, string Label, string TextColor, string BgColor, string ChartColor, int DisplayOrder);
public record UpdateStatusRequest(string Name, string Label, string TextColor, string BgColor, string ChartColor, int DisplayOrder);

public record CreateSeverityRequest(string Name, string Label, string TextColor, string BgColor, int DisplayOrder);
public record UpdateSeverityRequest(string Name, string Label, string TextColor, string BgColor, int DisplayOrder);

public record CreateProcessRequest(string Id, string Name, string Description, int DisplayOrder);
public record UpdateProcessRequest(string Name, string Description, int DisplayOrder);

public record CreateTaskRequest(string Name, string ProcessId);
public record UpdateTaskRequest(string Name, string ProcessId);

public record CreateUserRequest(string Id, string Name, string Email);
public record UpdateUserRequest(string Name, string Email);

// ── Ensure User (auto-registration via EDP login) ──

public record EnsureUserRequest(string Id, string Name, string Email);

public class EnsureUserResponse
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public bool IsActive { get; set; }
    public bool CanCreateIssue { get; set; }
    public bool CanEditIssue { get; set; }
    public bool CanResolveIssue { get; set; }
    public bool CanBulkUpload { get; set; }
    public bool CanAccessAdmin { get; set; }
    public bool IsBlocked { get; set; }
}

// ── Admin Dashboard Stats ──

public class AdminDashboardStats
{
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int BlockedUsers { get; set; }
    public int TotalIssues { get; set; }
    public int OpenIssues { get; set; }
    public int OverdueIssues { get; set; }
    public int ResolvedIssues { get; set; }
    public int CriticalIssues { get; set; }
    public int ActiveStatuses { get; set; }
    public int ActiveSeverities { get; set; }
    public int ActiveProcesses { get; set; }
    public int ActiveTasks { get; set; }
}

// ── Admin Enter App (login as user from admin panel) ──

public record EnterAppRequest(string UserId);

// ── Token Verification (Intranet DB: sp_token_redirect) ──

public record VerifyTokenRequest(string Token);

public class TokenRedirectResult
{
    public int Slno { get; set; }
    public string Tokenid { get; set; } = "";
    public string Userid { get; set; } = "";        // email
    public string Userempid { get; set; } = "";
    public string Username { get; set; } = "";
    public string? Redirecturl { get; set; }
    public int Isexpired { get; set; }
    public DateTime Create_time { get; set; }
}

// ── Employee Search (Intranet DB: v_employee_list) ──

public class IntranetEmployee
{
    public string Emp_ID { get; set; } = "";
    public string Emp_Name { get; set; } = "";
    public string? Department { get; set; }
    public string? Designation { get; set; }
    public string? Company_Name { get; set; }
    public string? Email { get; set; }
}
