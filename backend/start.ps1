## DMS Backend Startup Script
## Prompts for DB mode, starts Docker if needed, waits for SQL Server, then launches the API.

$ErrorActionPreference = "Stop"

Write-Host "`n=== DMS Backend Startup ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Select database:"
Write-Host "  1) Local Docker  (localhost:1433)"
Write-Host "  2) Production    (ASETIDEV02)"
Write-Host ""
$choice = Read-Host "Enter choice [1]"

if ($choice -eq "2") {
    $dbMode = "Production"
    $env:ASPNETCORE_ENVIRONMENT = "Production"
} else {
    $dbMode = "Local Docker"
    $env:ASPNETCORE_ENVIRONMENT = "Development"
}

Write-Host "`nUsing: $dbMode" -ForegroundColor Green

if ($dbMode -eq "Local Docker") {
    # 1. Ensure Docker is running
    Write-Host "`n[1/3] Checking Docker..." -ForegroundColor Yellow
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Docker Desktop is not running. Please start it first." -ForegroundColor Red
        exit 1
    }
    Write-Host "  Docker is running." -ForegroundColor Green

    # 2. Clean up stale container & start SQL Server
    Write-Host "`n[2/3] Starting SQL Server container..." -ForegroundColor Yellow
    $existing = docker ps -a --filter "name=dms-sqlserver" --format "{{.ID}}" 2>&1
    if ($existing) {
        Write-Host "  Found existing dms-sqlserver container. Removing..." -ForegroundColor Yellow
        docker rm -f dms-sqlserver 2>$null | Out-Null
    }
    docker compose up -d 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to start SQL Server container." -ForegroundColor Red
        Write-Host "  Check: docker logs dms-sqlserver" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "  Container started." -ForegroundColor Green

    # 3. Wait for SQL Server to accept connections
    Write-Host "`n[3/3] Waiting for SQL Server to be ready (up to 60s)..." -ForegroundColor Yellow
    $maxAttempts = 30
    $attempt = 0
    Write-Host -NoNewline "  "
    while ($attempt -lt $maxAttempts) {
        $attempt++
        $result = docker exec dms-sqlserver bash -c "/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'DmsStrong123P' -C -Q 'SELECT 1'" 2>&1
        if ($LASTEXITCODE -eq 0) {
            $elapsed = $attempt * 2
            Write-Host "`n  SQL Server is ready! (~${elapsed}s)" -ForegroundColor Green
            break
        }
        if ($attempt -eq $maxAttempts) {
            Write-Host "`n  ERROR: SQL Server did not start within 60s." -ForegroundColor Red
            Write-Host "  Run 'docker logs dms-sqlserver' to diagnose." -ForegroundColor Yellow
            exit 1
        }
        Write-Host -NoNewline "."
        Start-Sleep -Seconds 2
    }
} else {
    Write-Host "`nSkipping Docker setup (using production server)." -ForegroundColor Yellow
}

# Start the API
Write-Host "`nStarting DMS API..." -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
dotnet run --no-launch-profile --urls "http://localhost:4000"
