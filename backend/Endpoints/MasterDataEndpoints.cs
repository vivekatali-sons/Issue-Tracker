using DMS.API.Services;

namespace DMS.API.Endpoints;

public static class MasterDataEndpoints
{
    public static void MapMasterDataEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/master").WithTags("Master Data");

        // Require a valid session token on all master data endpoints
        group.AddEndpointFilter(async (context, next) =>
        {
            var token = context.HttpContext.Request.Headers["X-Session-Token"].FirstOrDefault();
            if (SessionStore.Validate(token) is null)
                return Results.Json(new { error = "Session expired. Please log in again." }, statusCode: 401);
            return await next(context);
        });

        group.MapGet("/", async (IMasterDataService service) =>
        {
            var data = await service.GetAllAsync();
            return Results.Ok(data);
        })
        .WithName("GetAllMasterData");

        group.MapGet("/statuses", async (IMasterDataService service) =>
            Results.Ok(await service.GetStatusesAsync()))
        .WithName("GetMasterStatuses");

        group.MapGet("/severities", async (IMasterDataService service) =>
            Results.Ok(await service.GetSeveritiesAsync()))
        .WithName("GetMasterSeverities");

        group.MapGet("/processes", async (IMasterDataService service) =>
            Results.Ok(await service.GetProcessesAsync()))
        .WithName("GetMasterProcesses");

        group.MapGet("/tasks", async (IMasterDataService service) =>
            Results.Ok(await service.GetTasksAsync()))
        .WithName("GetMasterTasks");

        group.MapGet("/users", async (IMasterDataService service) =>
            Results.Ok(await service.GetUsersAsync()))
        .WithName("GetMasterUsers");
    }
}
