using DMS.API.Models;
using DMS.API.Services;

namespace DMS.API.Endpoints;

public static class IssueEndpoints
{
    public static void MapIssueEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/issues").WithTags("Issues");

        // Require a valid session token on all issue endpoints
        group.AddEndpointFilter(async (context, next) =>
        {
            var token = context.HttpContext.Request.Headers["X-Session-Token"].FirstOrDefault();
            if (SessionStore.Validate(token) is null)
                return Results.Json(new { error = "Session expired. Please log in again." }, statusCode: 401);
            return await next(context);
        });

        // GET /api/issues
        group.MapGet("/", async (IIssueService service) =>
        {
            var issues = await service.GetAllAsync();
            return Results.Ok(issues);
        })
        .WithName("GetAllIssues")
        .WithSummary("Get all issues (list view)");

        // GET /api/issues/{id}
        group.MapGet("/{id:int}", async (int id, IIssueService service) =>
        {
            var issue = await service.GetByIdAsync(id);
            return issue is not null ? Results.Ok(issue) : Results.NotFound();
        })
        .WithName("GetIssueById")
        .WithSummary("Get issue detail by ID");

        // POST /api/issues
        group.MapPost("/", async (CreateIssueRequest request, IIssueService service) =>
        {
            var errors = new List<string>();
            if (string.IsNullOrWhiteSpace(request.ProcessId)) errors.Add("ProcessId is required");
            if (string.IsNullOrWhiteSpace(request.TaskId)) errors.Add("TaskId is required");
            if (string.IsNullOrWhiteSpace(request.IssueRaisedBy)) errors.Add("IssueRaisedBy is required");
            if (string.IsNullOrWhiteSpace(request.IssueTitle)) errors.Add("IssueTitle is required");
            if (string.IsNullOrWhiteSpace(request.IssueDescription)) errors.Add("IssueDescription is required");
            if (string.IsNullOrWhiteSpace(request.Severity)) errors.Add("Severity is required");
            if (string.IsNullOrWhiteSpace(request.AssignedTo)) errors.Add("AssignedTo is required");
            if (request.IssueDate == default) errors.Add("IssueDate is required");
            if (errors.Count > 0) return Results.BadRequest(new { errors });

            var id = await service.CreateAsync(request);
            return Results.Created($"/api/issues/{id}", new { id });
        })
        .WithName("CreateIssue")
        .WithSummary("Create a new issue");

        // PATCH /api/issues/{id}
        group.MapPatch("/{id:int}", async (int id, UpdateIssueRequest request, IIssueService service) =>
        {
            try
            {
                await service.UpdateAsync(id, request);
                return Results.NoContent();
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        })
        .WithName("UpdateIssue")
        .WithSummary("Update issue fields (status, assignee, severity, dates)");

        // DELETE /api/issues/{id}
        group.MapDelete("/{id:int}", async (int id, IIssueService service) =>
        {
            try
            {
                await service.DeleteAsync(id);
                return Results.NoContent();
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        })
        .WithName("DeleteIssue")
        .WithSummary("Delete an issue");

        // POST /api/issues/{id}/resolve
        group.MapPost("/{id:int}/resolve", async (int id, ResolveIssueRequest request, IIssueService service) =>
        {
            try
            {
                await service.ResolveAsync(id, request);
                return Results.Ok(new { message = "Issue resolved successfully" });
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        })
        .WithName("ResolveIssue")
        .WithSummary("Resolve an issue with resolution details");

        // POST /api/issues/{id}/reopen
        group.MapPost("/{id:int}/reopen", async (int id, ReopenIssueRequest request, IIssueService service) =>
        {
            try
            {
                await service.ReopenAsync(id, request);
                return Results.Ok(new { message = "Issue reopened successfully" });
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        })
        .WithName("ReopenIssue")
        .WithSummary("Reopen a resolved issue");

        // POST /api/issues/bulk
        group.MapPost("/bulk", async (HttpRequest httpRequest, IIssueService service) =>
        {
            if (!httpRequest.HasFormContentType)
                return Results.BadRequest(new { error = "Expected multipart/form-data" });

            var form = await httpRequest.ReadFormAsync();
            var file = form.Files.GetFile("file");

            if (file is null || file.Length == 0)
                return Results.BadRequest(new { error = "CSV file is required" });

            if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
                return Results.BadRequest(new { error = "Only .csv files are accepted" });

            if (file.Length > 5 * 1024 * 1024)
                return Results.BadRequest(new { error = "File size must be under 5MB" });

            using var stream = file.OpenReadStream();
            var result = await service.BulkCreateFromCsvAsync(stream);
            return Results.Ok(result);
        })
        .DisableAntiforgery()
        .WithName("BulkUploadIssues")
        .WithSummary("Bulk upload issues from a CSV file");
    }
}
