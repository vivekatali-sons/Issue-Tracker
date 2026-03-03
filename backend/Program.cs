using DMS.API.Data;
using DMS.API.Endpoints;
using DMS.API.Repositories;
using DMS.API.Services;

var builder = WebApplication.CreateBuilder(args);

// ── Database ──
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Missing 'DefaultConnection' connection string.");

builder.Services.AddSingleton<IDbConnectionFactory>(_ => new SqlServerConnectionFactory(connectionString));
builder.Services.AddSingleton<DbInitializer>();
builder.Services.AddSingleton<SeedData>();

// ── Intranet Database (token verification + employee search) ──
var intranetConnectionString = builder.Configuration.GetConnectionString("IntranetConnection")
    ?? throw new InvalidOperationException("Missing 'IntranetConnection' connection string.");
builder.Services.AddSingleton<IIntranetDbConnectionFactory>(_ => new IntranetConnectionFactory(intranetConnectionString));

// ── Repositories & Services ──
builder.Services.AddScoped<IIssueRepository, IssueRepository>();
builder.Services.AddScoped<IMasterDataRepository, MasterDataRepository>();
builder.Services.AddScoped<IAdminRepository, AdminRepository>();
builder.Services.AddScoped<IIntranetRepository, IntranetRepository>();
builder.Services.AddScoped<IIssueService, IssueService>();
builder.Services.AddScoped<IMasterDataService, MasterDataService>();
builder.Services.AddScoped<IAdminService, AdminService>();

// ── Swagger / OpenAPI ──
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ── CORS (configurable via appsettings "AllowedOrigins" or env var) ──
var allowedOrigins = builder.Configuration["AllowedOrigins"]
    ?? Environment.GetEnvironmentVariable("ALLOWED_ORIGINS")
    ?? "https://asdev.ali-sons.com:4446";
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(allowedOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// ── Initialize database schema on startup ──
using (var scope = app.Services.CreateScope())
{
    var dbInit = scope.ServiceProvider.GetRequiredService<DbInitializer>();
    await dbInit.InitializeAsync();

    // Always seed master data (idempotent)
    var seeder = scope.ServiceProvider.GetRequiredService<SeedData>();
    await seeder.SeedMasterDataAsync();

    // Only seed default admin in development (production: create via SQL or setup script)
    if (app.Environment.IsDevelopment())
    {
        await seeder.SeedAdminAsync();
    }

    // Only seed sample issues in Development
    if (app.Environment.IsDevelopment())
    {
        await seeder.SeedAsync();
    }
}

// ── Middleware pipeline ──

// Global exception handler
app.UseExceptionHandler(error => error.Run(async context =>
{
    var ex = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
    context.Response.StatusCode = 500;
    context.Response.ContentType = "application/json";
    var msg = ex?.Message ?? "An unexpected error occurred.";
    Console.Error.WriteLine($"[UNHANDLED] {ex?.GetType().Name}: {msg}");
    await context.Response.WriteAsJsonAsync(new { error = msg });
}));

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "DMS Issue Tracker API v1");
        options.RoutePrefix = "swagger";
    });
}

app.UseCors("Frontend");

// ── Map endpoints ──
app.MapIssueEndpoints();
app.MapMasterDataEndpoints();
app.MapAdminEndpoints();

// Health check
app.MapGet("/", () => Results.Ok(new { status = "healthy", service = "DMS Issue Tracker API" }))
   .WithTags("Health")
   .ExcludeFromDescription();

await app.RunAsync();
