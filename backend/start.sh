#!/usr/bin/env bash
## DMS Backend Startup Script
## Prompts for DB mode, starts Docker if needed, waits for SQL Server, then launches the API.

set -e

echo ""
echo "=== DMS Backend Startup ==="
echo ""
echo "Select database:"
echo "  1) Local Docker  (localhost:1433)"
echo "  2) Production    (ASETIDEV02)"
echo ""
printf "Enter choice [1]: "
read -r choice

case "$choice" in
    2)
        db_mode="Production"
        export ASPNETCORE_ENVIRONMENT="Production"
        ;;
    *)
        db_mode="Local Docker"
        export ASPNETCORE_ENVIRONMENT="Development"
        ;;
esac

echo ""
echo "Using: $db_mode"

if [ "$db_mode" = "Local Docker" ]; then
    # 1. Ensure Docker is running
    echo ""
    echo "[1/3] Checking Docker..."
    if ! docker info > /dev/null 2>&1; then
        echo "ERROR: Docker Desktop is not running. Please start it first."
        exit 1
    fi
    echo "  Docker is running."

    # 2. Clean up stale container & start SQL Server
    echo ""
    echo "[2/3] Starting SQL Server container..."
    existing=$(docker ps -a --filter "name=dms-sqlserver" --format "{{.ID}}" 2>/dev/null)
    if [ -n "$existing" ]; then
        echo "  Found existing dms-sqlserver container. Removing..."
        docker rm -f dms-sqlserver > /dev/null 2>&1
    fi
    docker compose up -d
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to start SQL Server container."
        echo "  Check: docker logs dms-sqlserver"
        exit 1
    fi
    echo "  Container started."

    # 3. Wait for SQL Server to accept connections
    echo ""
    echo "[3/3] Waiting for SQL Server to be ready (up to 60s)..."
    max_attempts=30
    attempt=0
    printf "  "
    while [ $attempt -lt $max_attempts ]; do
        attempt=$((attempt + 1))
        if docker exec dms-sqlserver bash -c "/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'DmsStrong123P' -C -Q 'SELECT 1'" > /dev/null 2>&1; then
            elapsed=$((attempt * 2))
            printf "\n  SQL Server is ready! (~${elapsed}s)\n"
            break
        fi
        if [ $attempt -eq $max_attempts ]; then
            printf "\n  ERROR: SQL Server did not start within 60s.\n"
            echo "  Run 'docker logs dms-sqlserver' to diagnose."
            exit 1
        fi
        printf "."
        sleep 2
    done
else
    echo ""
    echo "Skipping Docker setup (using production server)."
fi

# Start the API
echo ""
echo "Starting DMS API..."
echo "========================================="
echo ""
dotnet run --no-launch-profile --urls "http://localhost:4000"
