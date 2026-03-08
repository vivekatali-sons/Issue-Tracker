using DMS.API.Models;
using DMS.API.Repositories;
using DMS.API.Services;

namespace DMS.API.Endpoints;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this WebApplication app)
    {
        // ── Public endpoint: verify EDP token (user must be pre-added by admin) ──
        app.MapPost("/api/auth/verify-token", async (
            IIntranetRepository intranetRepo,
            IAdminRepository adminRepo,
            VerifyTokenRequest req) =>
        {
            if (string.IsNullOrWhiteSpace(req.Token))
                return Results.BadRequest(new { error = "token is required" });

            // 1. Verify token against Intranet DB
            var tokenResult = await intranetRepo.VerifyTokenAsync(req.Token);

            if (tokenResult is null || tokenResult.Isexpired != 0)
                return Results.Json(new { error = "Token is invalid or expired" }, statusCode: 401);

            // 2. Token valid — use emp ID as-is (MasterUsers stores IDs with leading zeros)
            var empId = tokenResult.Userempid?.Trim() ?? "";
            var user = await adminRepo.GetUserByIdAsync(empId);

            if (user is null)
                return Results.Json(new { error = "Access denied. Your account has not been registered. Contact admin." }, statusCode: 403);

            if (user.IsBlocked)
                return Results.Json(new { blocked = true, message = "Your account has been blocked. Contact admin." }, statusCode: 403);

            // Stamp last login
            await adminRepo.StampLastLoginAsync(empId);

            // Issue a session token for subsequent API calls
            var sessionToken = SessionStore.Create(user.Id);
            return Results.Ok(new { user, sessionToken });
        }).WithTags("Auth");

        var group = app.MapGroup("/api/admin").WithTags("Admin");

        // ── Dashboard Stats ──
        group.MapGet("/dashboard-stats", async (HttpContext ctx, IAdminService svc, IAdminRepository repo) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            return Results.Ok(await repo.GetDashboardStatsAsync());
        });

        // ── Auth ──
        group.MapPost("/login", async (AdminLoginRequest req, IAdminService svc) =>
        {
            var result = await svc.LoginAsync(req);
            return result is null
                ? Results.Unauthorized()
                : Results.Ok(result);
        });

        // ── Statuses ──
        group.MapGet("/statuses", async (HttpContext ctx, IAdminService svc, IAdminRepository repo) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            return Results.Ok(await repo.GetAllStatusesAsync());
        });

        group.MapPost("/statuses", async (HttpContext ctx, IAdminService svc, IAdminRepository repo, CreateStatusRequest req) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            var id = await repo.CreateStatusAsync(req);
            return Results.Created($"/api/admin/statuses/{id}", new { id });
        });

        group.MapPost("/statuses/{id:int}/update", async (int id, HttpContext ctx, IAdminService svc, IAdminRepository repo, UpdateStatusRequest req) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            await repo.UpdateStatusAsync(id, req);
            return Results.NoContent();
        });

        group.MapDelete("/statuses/{id:int}", async (int id, HttpContext ctx, IAdminService svc, IAdminRepository repo) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            await repo.ToggleStatusActiveAsync(id);
            return Results.NoContent();
        });

        // ── Severities ──
        group.MapGet("/severities", async (HttpContext ctx, IAdminService svc, IAdminRepository repo) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            return Results.Ok(await repo.GetAllSeveritiesAsync());
        });

        group.MapPost("/severities", async (HttpContext ctx, IAdminService svc, IAdminRepository repo, CreateSeverityRequest req) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            var id = await repo.CreateSeverityAsync(req);
            return Results.Created($"/api/admin/severities/{id}", new { id });
        });

        group.MapPost("/severities/{id:int}/update", async (int id, HttpContext ctx, IAdminService svc, IAdminRepository repo, UpdateSeverityRequest req) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            await repo.UpdateSeverityAsync(id, req);
            return Results.NoContent();
        });

        group.MapDelete("/severities/{id:int}", async (int id, HttpContext ctx, IAdminService svc, IAdminRepository repo) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            await repo.ToggleSeverityActiveAsync(id);
            return Results.NoContent();
        });

        // ── Processes ──
        group.MapGet("/processes", async (HttpContext ctx, IAdminService svc, IAdminRepository repo) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            return Results.Ok(await repo.GetAllProcessesAsync());
        });

        group.MapPost("/processes", async (HttpContext ctx, IAdminService svc, IAdminRepository repo, CreateProcessRequest req) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            await repo.CreateProcessAsync(req);
            return Results.Created($"/api/admin/processes/{req.Id}", new { id = req.Id });
        });

        group.MapPost("/processes/{id}/update", async (string id, HttpContext ctx, IAdminService svc, IAdminRepository repo, UpdateProcessRequest req) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            await repo.UpdateProcessAsync(id, req);
            return Results.NoContent();
        });

        group.MapDelete("/processes/{id}", async (string id, HttpContext ctx, IAdminService svc, IAdminRepository repo) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            await repo.ToggleProcessActiveAsync(id);
            return Results.NoContent();
        });

        // ── Tasks ──
        group.MapGet("/tasks", async (HttpContext ctx, IAdminService svc, IAdminRepository repo) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            return Results.Ok(await repo.GetAllTasksAsync());
        });

        group.MapPost("/tasks", async (HttpContext ctx, IAdminService svc, IAdminRepository repo, CreateTaskRequest req) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            var id = await repo.CreateTaskAsync(req);
            return Results.Created($"/api/admin/tasks/{id}", new { id });
        });

        group.MapPost("/tasks/{id}/update", async (string id, HttpContext ctx, IAdminService svc, IAdminRepository repo, UpdateTaskRequest req) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            await repo.UpdateTaskAsync(id, req);
            return Results.NoContent();
        });

        group.MapDelete("/tasks/{id}", async (string id, HttpContext ctx, IAdminService svc, IAdminRepository repo) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            await repo.ToggleTaskActiveAsync(id);
            return Results.NoContent();
        });

        // ── Users ──
        group.MapGet("/users", async (HttpContext ctx, IAdminService svc, IAdminRepository repo) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            return Results.Ok(await repo.GetAllUsersAsync());
        });

        group.MapPost("/users", async (HttpContext ctx, IAdminService svc, IAdminRepository repo, CreateUserRequest req) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            await repo.CreateUserAsync(req);
            return Results.Created($"/api/admin/users/{req.Id}", new { id = req.Id });
        });

        group.MapPost("/users/{id}/update", async (string id, HttpContext ctx, IAdminService svc, IAdminRepository repo, UpdateUserRequest req) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            await repo.UpdateUserAsync(id, req);
            return Results.NoContent();
        });

        group.MapDelete("/users/{id}", async (string id, HttpContext ctx, IAdminService svc, IAdminRepository repo) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            await repo.ToggleUserActiveAsync(id);
            return Results.NoContent();
        });

        // ── Employee Search (Intranet DB) ──
        group.MapGet("/employees/search", async (string q, HttpContext ctx, IAdminService svc, IIntranetRepository intranetRepo) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
                return Results.BadRequest(new { error = "Search query must be at least 2 characters" });
            var employees = await intranetRepo.SearchEmployeesAsync(q.Trim());
            return Results.Ok(employees);
        });

        group.MapPost("/employees/add", async (HttpContext ctx, IAdminService svc, IAdminRepository adminRepo, EnsureUserRequest req) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(req.Id))
                return Results.BadRequest(new { error = "id is required" });
            var result = await adminRepo.EnsureUserAsync(req);
            return result is null ? Results.StatusCode(500) : Results.Ok(result);
        });

        // ── Enter App (login as user from admin panel) ──
        group.MapPost("/enter-app", async (HttpContext ctx, IAdminService svc, IAdminRepository adminRepo, EnterAppRequest req) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(req.UserId))
                return Results.BadRequest(new { error = "userId is required" });

            var user = await adminRepo.GetUserByIdAsync(req.UserId);
            if (user is null)
                return Results.NotFound(new { error = "User not found or inactive" });

            await adminRepo.StampLastLoginAsync(req.UserId);
            var sessionToken = SessionStore.Create(user.Id);
            return Results.Ok(new { user, sessionToken });
        });

        // ── Permissions ──
        group.MapGet("/permissions", async (HttpContext ctx, IAdminService svc, IAdminRepository repo) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            return Results.Ok(await repo.GetAllUserPermissionsAsync());
        });

        group.MapGet("/permissions/{userId}", async (string userId, HttpContext ctx, IAdminService svc, IAdminRepository repo) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            var perm = await repo.GetUserPermissionsAsync(userId);
            return perm is null ? Results.NotFound() : Results.Ok(perm);
        });

        group.MapPost("/permissions/{userId}/update", async (string userId, HttpContext ctx, IAdminService svc, IAdminRepository repo, UpdateUserPermissionsRequest req) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            await repo.UpsertUserPermissionsAsync(userId, req);
            return Results.NoContent();
        });

        // ── Audit Logs ──
        group.MapGet("/audit-logs", async (HttpContext ctx, IAdminService svc, IAuditRepository auditRepo,
            string? entityType, int? entityId, string? userId, string? action, int? pageSize, int? page) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            var logs = await auditRepo.GetLogsAsync(entityType, entityId, userId, action, pageSize ?? 50, page ?? 1);
            return Results.Ok(logs);
        });

        group.MapGet("/audit-logs/issue/{issueId:int}", async (int issueId, HttpContext ctx, IAdminService svc, IAuditRepository auditRepo) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            var logs = await auditRepo.GetByIssueAsync(issueId);
            return Results.Ok(logs);
        });

        // ── Deleted Issues (Recycle Bin) ──
        group.MapGet("/deleted-issues", async (HttpContext ctx, IAdminService svc, IAuditRepository auditRepo) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            var issues = await auditRepo.GetDeletedIssuesAsync();
            return Results.Ok(issues);
        });

        group.MapPost("/deleted-issues/{id:int}/restore", async (int id, HttpContext ctx, IAdminService svc, IAuditRepository auditRepo) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            await auditRepo.RestoreIssueAsync(id);
            await auditRepo.InsertAsync(new AuditLog
            {
                Action = "Restored",
                EntityType = "Issue",
                EntityId = id,
                UserId = "admin",
            });
            return Results.Ok(new { message = "Issue restored successfully" });
        });

        group.MapPost("/deleted-issues/{id:int}/hard-delete", async (int id, HttpContext ctx, IAdminService svc, IAuditRepository auditRepo) =>
        {
            if (!Authorize(ctx, svc)) return Results.Unauthorized();
            await auditRepo.HardDeleteIssueAsync(id);
            return Results.Ok(new { message = "Issue permanently deleted" });
        });
    }

    private static bool Authorize(HttpContext ctx, IAdminService svc)
    {
        var token = ctx.Request.Headers["X-Admin-Token"].FirstOrDefault();
        return token is not null && svc.ValidateToken(token);
    }
}
