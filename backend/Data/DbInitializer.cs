using Dapper;

namespace DMS.API.Data;

public class DbInitializer(IDbConnectionFactory connectionFactory, ILogger<DbInitializer> logger)
{
    public async Task InitializeAsync()
    {
        using var connection = connectionFactory.CreateConnection();

        logger.LogInformation("Initializing database schema...");

        // ── Create database if not exists (connect to master first) ──
        // Skip gracefully if the user lacks CREATE DATABASE permission (e.g. on shared dev servers).
        try
        {
            await CreateDatabaseIfNotExistsAsync();
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number == 262)
        {
            logger.LogWarning("CREATE DATABASE permission denied — skipping (database likely already exists).");
        }

        // ── Tables ──
        await connection.ExecuteAsync("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Issues')
            CREATE TABLE Issues (
                Id               INT IDENTITY(1,1) PRIMARY KEY,
                ProcessId        NVARCHAR(100)  NOT NULL,
                TaskId           NVARCHAR(100)  NOT NULL,
                IssueDate        DATETIME2      NOT NULL,
                IssueRaisedBy    NVARCHAR(100)  NOT NULL,
                IssueTitle       NVARCHAR(500)  NOT NULL,
                IssueDescription NVARCHAR(MAX)  NOT NULL DEFAULT '',
                Status           NVARCHAR(50)   NOT NULL DEFAULT 'New',
                Severity         NVARCHAR(50)   NOT NULL,
                AssignedTo       NVARCHAR(100)  NOT NULL,
                AssigningDate    DATETIME2      NULL,
                DueDate          DATETIME2      NULL,
                CurrentVersion   INT            NOT NULL DEFAULT 1,
                ReopenCount      INT            NOT NULL DEFAULT 0,
                CreatedAt        DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
                UpdatedAt        DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
            );
            """);

        await connection.ExecuteAsync("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'IssueDependentProcesses')
            CREATE TABLE IssueDependentProcesses (
                Id        INT IDENTITY(1,1) PRIMARY KEY,
                IssueId   INT            NOT NULL REFERENCES Issues(Id) ON DELETE CASCADE,
                ProcessId NVARCHAR(100)  NOT NULL
            );
            """);

        await connection.ExecuteAsync("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FileAttachments')
            CREATE TABLE FileAttachments (
                Id          INT IDENTITY(1,1) PRIMARY KEY,
                IssueId     INT            NOT NULL REFERENCES Issues(Id) ON DELETE CASCADE,
                FileName    NVARCHAR(500)  NOT NULL,
                FileSize    BIGINT         NOT NULL,
                ContentType NVARCHAR(200)  NOT NULL,
                DataUrl     NVARCHAR(MAX)  NOT NULL
            );
            """);

        await connection.ExecuteAsync("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'IssueVersions')
            CREATE TABLE IssueVersions (
                Id             INT IDENTITY(1,1) PRIMARY KEY,
                IssueId        INT            NOT NULL REFERENCES Issues(Id) ON DELETE CASCADE,
                VersionNumber  INT            NOT NULL,
                CreatedDate    DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
                AssignedTo     NVARCHAR(100)  NOT NULL,
                AssigningDate  DATETIME2      NULL,
                DueDate        DATETIME2      NULL,
                Status         NVARCHAR(50)   NOT NULL,
                ReopenReason   NVARCHAR(MAX)  NULL,
                ChangesSummary NVARCHAR(MAX)  NULL
            );
            """);

        // Add ChangesSummary column if table already exists without it
        await connection.ExecuteAsync("""
            IF NOT EXISTS (
                SELECT 1 FROM sys.columns
                WHERE object_id = OBJECT_ID('IssueVersions') AND name = 'ChangesSummary'
            )
            ALTER TABLE IssueVersions ADD ChangesSummary NVARCHAR(MAX) NULL;
            """);

        // Add ModifiedBy column if table already exists without it
        await connection.ExecuteAsync("""
            IF NOT EXISTS (
                SELECT 1 FROM sys.columns
                WHERE object_id = OBJECT_ID('IssueVersions') AND name = 'ModifiedBy'
            )
            ALTER TABLE IssueVersions ADD ModifiedBy NVARCHAR(100) NULL;
            """);

        await connection.ExecuteAsync("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Resolutions')
            CREATE TABLE Resolutions (
                Id                 INT IDENTITY(1,1) PRIMARY KEY,
                IssueId            INT            NOT NULL REFERENCES Issues(Id) ON DELETE CASCADE,
                VersionNumber      INT            NOT NULL,
                ResolvedDate       DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
                ResolvedBy         NVARCHAR(100)  NOT NULL,
                ResolutionNotes    NVARCHAR(MAX)  NOT NULL DEFAULT '',
                RootCause          NVARCHAR(MAX)  NOT NULL DEFAULT '',
                PreventiveMeasures NVARCHAR(MAX)  NOT NULL DEFAULT '',
                VerificationDate   DATETIME2      NULL
            );
            """);

        await connection.ExecuteAsync("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ResolutionTesters')
            CREATE TABLE ResolutionTesters (
                Id           INT IDENTITY(1,1) PRIMARY KEY,
                ResolutionId INT            NOT NULL REFERENCES Resolutions(Id) ON DELETE CASCADE,
                UserId       NVARCHAR(100)  NOT NULL
            );
            """);

        await connection.ExecuteAsync("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DependentProcessTestResults')
            CREATE TABLE DependentProcessTestResults (
                Id           INT IDENTITY(1,1) PRIMARY KEY,
                ResolutionId INT            NULL REFERENCES Resolutions(Id),
                VersionId    INT            NULL REFERENCES IssueVersions(Id),
                ProcessId    NVARCHAR(100)  NOT NULL,
                Tested       BIT            NOT NULL DEFAULT 0,
                TestDate     DATETIME2      NULL
            );
            """);

        await connection.ExecuteAsync("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TestResultTesters')
            CREATE TABLE TestResultTesters (
                Id           INT IDENTITY(1,1) PRIMARY KEY,
                TestResultId INT            NOT NULL REFERENCES DependentProcessTestResults(Id) ON DELETE CASCADE,
                UserId       NVARCHAR(100)  NOT NULL
            );
            """);

        // ── Master Data Tables ──

        await connection.ExecuteAsync("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MasterStatuses')
            CREATE TABLE MasterStatuses (
                Id           INT IDENTITY(1,1) PRIMARY KEY,
                Name         NVARCHAR(50)   NOT NULL UNIQUE,
                Label        NVARCHAR(50)   NOT NULL,
                TextColor    NVARCHAR(50)   NOT NULL,
                BgColor      NVARCHAR(50)   NOT NULL,
                ChartColor   NVARCHAR(20)   NOT NULL DEFAULT '#6b7280',
                DisplayOrder INT            NOT NULL DEFAULT 0,
                IsActive     BIT            NOT NULL DEFAULT 1
            );
            """);

        await connection.ExecuteAsync("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MasterSeverities')
            CREATE TABLE MasterSeverities (
                Id           INT IDENTITY(1,1) PRIMARY KEY,
                Name         NVARCHAR(50)   NOT NULL UNIQUE,
                Label        NVARCHAR(50)   NOT NULL,
                TextColor    NVARCHAR(50)   NOT NULL,
                BgColor      NVARCHAR(50)   NOT NULL,
                DisplayOrder INT            NOT NULL DEFAULT 0,
                IsActive     BIT            NOT NULL DEFAULT 1
            );
            """);

        await connection.ExecuteAsync("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MasterProcesses')
            CREATE TABLE MasterProcesses (
                Id           NVARCHAR(10)   PRIMARY KEY,
                Name         NVARCHAR(200)  NOT NULL,
                Description  NVARCHAR(500)  NOT NULL DEFAULT '',
                DisplayOrder INT            NOT NULL DEFAULT 0,
                IsActive     BIT            NOT NULL DEFAULT 1
            );
            """);

        await connection.ExecuteAsync("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MasterTasks')
            CREATE TABLE MasterTasks (
                Id           NVARCHAR(10)   PRIMARY KEY,
                Name         NVARCHAR(200)  NOT NULL,
                ProcessId    NVARCHAR(10)   NOT NULL REFERENCES MasterProcesses(Id),
                DisplayOrder INT            NOT NULL DEFAULT 0,
                IsActive     BIT            NOT NULL DEFAULT 1
            );
            """);

        await connection.ExecuteAsync("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MasterUsers')
            CREATE TABLE MasterUsers (
                Id           NVARCHAR(10)   PRIMARY KEY,
                Name         NVARCHAR(200)  NOT NULL,
                Email        NVARCHAR(300)  NOT NULL,
                DisplayOrder INT            NOT NULL DEFAULT 0,
                IsActive     BIT            NOT NULL DEFAULT 1
            );
            """);

        // ── Admin Tables ──

        await connection.ExecuteAsync("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AdminCredentials')
            CREATE TABLE AdminCredentials (
                Id           INT IDENTITY(1,1) PRIMARY KEY,
                Username     NVARCHAR(100)  NOT NULL UNIQUE,
                PasswordHash NVARCHAR(500)  NOT NULL,
                CreatedAt    DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
            );
            """);

        await connection.ExecuteAsync("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserPermissions')
            CREATE TABLE UserPermissions (
                Id              INT IDENTITY(1,1) PRIMARY KEY,
                UserId          NVARCHAR(10)   NOT NULL UNIQUE,
                CanCreateIssue  BIT            NOT NULL DEFAULT 1,
                CanEditIssue    BIT            NOT NULL DEFAULT 1,
                CanResolveIssue BIT            NOT NULL DEFAULT 1,
                CanBulkUpload   BIT            NOT NULL DEFAULT 1,
                CanAccessAdmin  BIT            NOT NULL DEFAULT 0,
                IsBlocked       BIT            NOT NULL DEFAULT 0
            );
            """);

        logger.LogInformation("Tables created. Creating stored procedures...");

        // ── Stored Procedures ──

        await CreateOrAlterProcAsync(connection, "sp_GetAllIssues", """
            CREATE OR ALTER PROCEDURE sp_GetAllIssues
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT * FROM Issues ORDER BY CreatedAt DESC;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_GetIssueById", """
            CREATE OR ALTER PROCEDURE sp_GetIssueById
                @Id INT
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT * FROM Issues WHERE Id = @Id;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_CreateIssue", """
            CREATE OR ALTER PROCEDURE sp_CreateIssue
                @ProcessId        NVARCHAR(100),
                @TaskId           NVARCHAR(100),
                @IssueDate        DATETIME2,
                @IssueRaisedBy    NVARCHAR(100),
                @IssueTitle       NVARCHAR(500),
                @IssueDescription NVARCHAR(MAX),
                @Status           NVARCHAR(50),
                @Severity         NVARCHAR(50),
                @AssignedTo       NVARCHAR(100),
                @AssigningDate    DATETIME2 = NULL,
                @DueDate          DATETIME2 = NULL,
                @CurrentVersion   INT = 1,
                @ReopenCount      INT = 0
            AS
            BEGIN
                SET NOCOUNT ON;
                INSERT INTO Issues
                    (ProcessId, TaskId, IssueDate, IssueRaisedBy, IssueTitle, IssueDescription,
                     Status, Severity, AssignedTo, AssigningDate, DueDate,
                     CurrentVersion, ReopenCount, CreatedAt, UpdatedAt)
                VALUES
                    (@ProcessId, @TaskId, @IssueDate, @IssueRaisedBy, @IssueTitle, @IssueDescription,
                     @Status, @Severity, @AssignedTo, @AssigningDate, @DueDate,
                     @CurrentVersion, @ReopenCount, SYSUTCDATETIME(), SYSUTCDATETIME());
                SELECT CAST(SCOPE_IDENTITY() AS INT);
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_UpdateIssue", """
            CREATE OR ALTER PROCEDURE sp_UpdateIssue
                @Id               INT,
                @IssueTitle       NVARCHAR(500),
                @IssueDescription NVARCHAR(MAX),
                @Status           NVARCHAR(50),
                @Severity         NVARCHAR(50),
                @AssignedTo       NVARCHAR(100),
                @AssigningDate    DATETIME2 = NULL,
                @DueDate          DATETIME2 = NULL,
                @CurrentVersion   INT,
                @ReopenCount      INT
            AS
            BEGIN
                SET NOCOUNT ON;
                UPDATE Issues SET
                    IssueTitle       = @IssueTitle,
                    IssueDescription = @IssueDescription,
                    Status           = @Status,
                    Severity         = @Severity,
                    AssignedTo       = @AssignedTo,
                    AssigningDate    = @AssigningDate,
                    DueDate          = @DueDate,
                    CurrentVersion   = @CurrentVersion,
                    ReopenCount      = @ReopenCount,
                    UpdatedAt        = SYSUTCDATETIME()
                WHERE Id = @Id;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_DeleteIssue", """
            CREATE OR ALTER PROCEDURE sp_DeleteIssue
                @Id INT
            AS
            BEGIN
                SET NOCOUNT ON;
                BEGIN TRANSACTION;
                -- 1. Delete test-result testers linked via Resolutions
                DELETE trt FROM TestResultTesters trt
                    INNER JOIN DependentProcessTestResults dptr ON trt.TestResultId = dptr.Id
                    INNER JOIN Resolutions r ON dptr.ResolutionId = r.Id
                    WHERE r.IssueId = @Id;
                -- 2. Delete test-result testers linked via IssueVersions
                DELETE trt FROM TestResultTesters trt
                    INNER JOIN DependentProcessTestResults dptr ON trt.TestResultId = dptr.Id
                    INNER JOIN IssueVersions v ON dptr.VersionId = v.Id
                    WHERE v.IssueId = @Id;
                -- 3. Delete dep test results linked via Resolutions
                DELETE dptr FROM DependentProcessTestResults dptr
                    INNER JOIN Resolutions r ON dptr.ResolutionId = r.Id
                    WHERE r.IssueId = @Id;
                -- 4. Delete dep test results linked via IssueVersions
                DELETE dptr FROM DependentProcessTestResults dptr
                    INNER JOIN IssueVersions v ON dptr.VersionId = v.Id
                    WHERE v.IssueId = @Id;
                -- 5. Delete resolution testers
                DELETE rt FROM ResolutionTesters rt
                    INNER JOIN Resolutions r ON rt.ResolutionId = r.Id
                    WHERE r.IssueId = @Id;
                -- 6. Delete resolutions
                DELETE FROM Resolutions WHERE IssueId = @Id;
                -- 7. Delete versions
                DELETE FROM IssueVersions WHERE IssueId = @Id;
                -- 8. Delete dependent processes
                DELETE FROM IssueDependentProcesses WHERE IssueId = @Id;
                -- 9. Delete attachments
                DELETE FROM FileAttachments WHERE IssueId = @Id;
                -- 10. Delete the issue itself
                DELETE FROM Issues WHERE Id = @Id;
                COMMIT TRANSACTION;
            END
            """);

        // ── Dependent Processes ──

        await CreateOrAlterProcAsync(connection, "sp_DeleteDependentProcesses", """
            CREATE OR ALTER PROCEDURE sp_DeleteDependentProcesses
                @IssueId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                DELETE FROM IssueDependentProcesses WHERE IssueId = @IssueId;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_AddDependentProcess", """
            CREATE OR ALTER PROCEDURE sp_AddDependentProcess
                @IssueId   INT,
                @ProcessId NVARCHAR(100)
            AS
            BEGIN
                SET NOCOUNT ON;
                INSERT INTO IssueDependentProcesses (IssueId, ProcessId) VALUES (@IssueId, @ProcessId);
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_GetDependentProcesses", """
            CREATE OR ALTER PROCEDURE sp_GetDependentProcesses
                @IssueId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT ProcessId FROM IssueDependentProcesses WHERE IssueId = @IssueId;
            END
            """);

        // ── Attachments ──

        await CreateOrAlterProcAsync(connection, "sp_AddAttachment", """
            CREATE OR ALTER PROCEDURE sp_AddAttachment
                @IssueId     INT,
                @FileName    NVARCHAR(500),
                @FileSize    BIGINT,
                @ContentType NVARCHAR(200),
                @DataUrl     NVARCHAR(MAX)
            AS
            BEGIN
                SET NOCOUNT ON;
                INSERT INTO FileAttachments (IssueId, FileName, FileSize, ContentType, DataUrl)
                VALUES (@IssueId, @FileName, @FileSize, @ContentType, @DataUrl);
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_GetAttachments", """
            CREATE OR ALTER PROCEDURE sp_GetAttachments
                @IssueId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT * FROM FileAttachments WHERE IssueId = @IssueId;
            END
            """);

        // ── Versions ──

        await CreateOrAlterProcAsync(connection, "sp_AddVersion", """
            CREATE OR ALTER PROCEDURE sp_AddVersion
                @IssueId        INT,
                @VersionNumber  INT,
                @AssignedTo     NVARCHAR(100),
                @AssigningDate  DATETIME2 = NULL,
                @DueDate        DATETIME2 = NULL,
                @Status         NVARCHAR(50),
                @ReopenReason   NVARCHAR(MAX) = NULL,
                @ChangesSummary NVARCHAR(MAX) = NULL,
                @ModifiedBy     NVARCHAR(100) = NULL
            AS
            BEGIN
                SET NOCOUNT ON;
                INSERT INTO IssueVersions
                    (IssueId, VersionNumber, CreatedDate, AssignedTo, AssigningDate, DueDate, Status, ReopenReason, ChangesSummary, ModifiedBy)
                VALUES
                    (@IssueId, @VersionNumber, SYSUTCDATETIME(), @AssignedTo, @AssigningDate, @DueDate, @Status, @ReopenReason, @ChangesSummary, @ModifiedBy);
                SELECT CAST(SCOPE_IDENTITY() AS INT);
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_GetVersions", """
            CREATE OR ALTER PROCEDURE sp_GetVersions
                @IssueId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT * FROM IssueVersions WHERE IssueId = @IssueId ORDER BY VersionNumber;
            END
            """);

        // ── Resolutions ──

        await CreateOrAlterProcAsync(connection, "sp_AddResolution", """
            CREATE OR ALTER PROCEDURE sp_AddResolution
                @IssueId            INT,
                @VersionNumber      INT,
                @ResolvedBy         NVARCHAR(100),
                @ResolutionNotes    NVARCHAR(MAX),
                @RootCause          NVARCHAR(MAX) = '',
                @PreventiveMeasures NVARCHAR(MAX) = '',
                @VerificationDate   DATETIME2 = NULL
            AS
            BEGIN
                SET NOCOUNT ON;
                INSERT INTO Resolutions
                    (IssueId, VersionNumber, ResolvedDate, ResolvedBy, ResolutionNotes, RootCause, PreventiveMeasures, VerificationDate)
                VALUES
                    (@IssueId, @VersionNumber, SYSUTCDATETIME(), @ResolvedBy, @ResolutionNotes, @RootCause, @PreventiveMeasures, @VerificationDate);
                SELECT CAST(SCOPE_IDENTITY() AS INT);
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_GetLatestResolution", """
            CREATE OR ALTER PROCEDURE sp_GetLatestResolution
                @IssueId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT TOP 1 * FROM Resolutions WHERE IssueId = @IssueId ORDER BY VersionNumber DESC;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_AddResolutionTester", """
            CREATE OR ALTER PROCEDURE sp_AddResolutionTester
                @ResolutionId INT,
                @UserId       NVARCHAR(100)
            AS
            BEGIN
                SET NOCOUNT ON;
                INSERT INTO ResolutionTesters (ResolutionId, UserId) VALUES (@ResolutionId, @UserId);
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_GetResolutionTesters", """
            CREATE OR ALTER PROCEDURE sp_GetResolutionTesters
                @ResolutionId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT UserId FROM ResolutionTesters WHERE ResolutionId = @ResolutionId;
            END
            """);

        // ── Dependent Process Test Results ──

        await CreateOrAlterProcAsync(connection, "sp_AddDepTestResult", """
            CREATE OR ALTER PROCEDURE sp_AddDepTestResult
                @ResolutionId INT = NULL,
                @VersionId    INT = NULL,
                @ProcessId    NVARCHAR(100),
                @Tested       BIT,
                @TestDate     DATETIME2 = NULL
            AS
            BEGIN
                SET NOCOUNT ON;
                INSERT INTO DependentProcessTestResults (ResolutionId, VersionId, ProcessId, Tested, TestDate)
                VALUES (@ResolutionId, @VersionId, @ProcessId, @Tested, @TestDate);
                SELECT CAST(SCOPE_IDENTITY() AS INT);
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_GetDepTestResults", """
            CREATE OR ALTER PROCEDURE sp_GetDepTestResults
                @ResolutionId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT * FROM DependentProcessTestResults WHERE ResolutionId = @ResolutionId;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_AddTestResultTester", """
            CREATE OR ALTER PROCEDURE sp_AddTestResultTester
                @TestResultId INT,
                @UserId       NVARCHAR(100)
            AS
            BEGIN
                SET NOCOUNT ON;
                INSERT INTO TestResultTesters (TestResultId, UserId) VALUES (@TestResultId, @UserId);
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_GetTestResultTesters", """
            CREATE OR ALTER PROCEDURE sp_GetTestResultTesters
                @TestResultId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT UserId FROM TestResultTesters WHERE TestResultId = @TestResultId;
            END
            """);

        // ── Master Data SPs ──

        await CreateOrAlterProcAsync(connection, "sp_GetMasterStatuses", """
            CREATE OR ALTER PROCEDURE sp_GetMasterStatuses
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT Id, Name, Label, TextColor, BgColor, ChartColor, DisplayOrder, IsActive
                FROM MasterStatuses
                WHERE IsActive = 1
                ORDER BY DisplayOrder;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_GetMasterSeverities", """
            CREATE OR ALTER PROCEDURE sp_GetMasterSeverities
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT Id, Name, Label, TextColor, BgColor, DisplayOrder, IsActive
                FROM MasterSeverities
                WHERE IsActive = 1
                ORDER BY DisplayOrder;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_GetMasterProcesses", """
            CREATE OR ALTER PROCEDURE sp_GetMasterProcesses
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT Id, Name, Description, DisplayOrder, IsActive
                FROM MasterProcesses
                WHERE IsActive = 1
                ORDER BY DisplayOrder;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_GetMasterTasks", """
            CREATE OR ALTER PROCEDURE sp_GetMasterTasks
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT Id, Name, ProcessId, DisplayOrder, IsActive
                FROM MasterTasks
                WHERE IsActive = 1
                ORDER BY DisplayOrder;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_GetMasterUsers", """
            CREATE OR ALTER PROCEDURE sp_GetMasterUsers
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT Id, Name, Email, DisplayOrder, IsActive
                FROM MasterUsers
                WHERE IsActive = 1
                ORDER BY DisplayOrder;
            END
            """);

        // ── Admin SPs ──

        await CreateOrAlterProcAsync(connection, "sp_GetAdminByUsername", """
            CREATE OR ALTER PROCEDURE sp_GetAdminByUsername
                @Username NVARCHAR(100)
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT Id, Username, PasswordHash, CreatedAt
                FROM AdminCredentials WHERE Username = @Username;
            END
            """);

        // ── Admin CRUD SPs for Master Data ──

        await CreateOrAlterProcAsync(connection, "sp_GetAllMasterStatuses", """
            CREATE OR ALTER PROCEDURE sp_GetAllMasterStatuses
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT Id, Name, Label, TextColor, BgColor, ChartColor, DisplayOrder, IsActive
                FROM MasterStatuses ORDER BY DisplayOrder;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_CreateMasterStatus", """
            CREATE OR ALTER PROCEDURE sp_CreateMasterStatus
                @Name NVARCHAR(50), @Label NVARCHAR(50),
                @TextColor NVARCHAR(50), @BgColor NVARCHAR(50),
                @ChartColor NVARCHAR(20), @DisplayOrder INT
            AS
            BEGIN
                SET NOCOUNT ON;
                INSERT INTO MasterStatuses (Name, Label, TextColor, BgColor, ChartColor, DisplayOrder, IsActive)
                VALUES (@Name, @Label, @TextColor, @BgColor, @ChartColor, @DisplayOrder, 1);
                SELECT CAST(SCOPE_IDENTITY() AS INT);
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_UpdateMasterStatus", """
            CREATE OR ALTER PROCEDURE sp_UpdateMasterStatus
                @Id INT, @Name NVARCHAR(50), @Label NVARCHAR(50),
                @TextColor NVARCHAR(50), @BgColor NVARCHAR(50),
                @ChartColor NVARCHAR(20), @DisplayOrder INT
            AS
            BEGIN
                SET NOCOUNT ON;
                UPDATE MasterStatuses SET Name=@Name, Label=@Label, TextColor=@TextColor,
                    BgColor=@BgColor, ChartColor=@ChartColor, DisplayOrder=@DisplayOrder
                WHERE Id = @Id;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_ToggleMasterStatusActive", """
            CREATE OR ALTER PROCEDURE sp_ToggleMasterStatusActive
                @Id INT
            AS
            BEGIN
                SET NOCOUNT ON;
                UPDATE MasterStatuses SET IsActive = CASE WHEN IsActive = 1 THEN 0 ELSE 1 END WHERE Id = @Id;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_GetAllMasterSeverities", """
            CREATE OR ALTER PROCEDURE sp_GetAllMasterSeverities
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT Id, Name, Label, TextColor, BgColor, DisplayOrder, IsActive
                FROM MasterSeverities ORDER BY DisplayOrder;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_CreateMasterSeverity", """
            CREATE OR ALTER PROCEDURE sp_CreateMasterSeverity
                @Name NVARCHAR(50), @Label NVARCHAR(50),
                @TextColor NVARCHAR(50), @BgColor NVARCHAR(50), @DisplayOrder INT
            AS
            BEGIN
                SET NOCOUNT ON;
                INSERT INTO MasterSeverities (Name, Label, TextColor, BgColor, DisplayOrder, IsActive)
                VALUES (@Name, @Label, @TextColor, @BgColor, @DisplayOrder, 1);
                SELECT CAST(SCOPE_IDENTITY() AS INT);
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_UpdateMasterSeverity", """
            CREATE OR ALTER PROCEDURE sp_UpdateMasterSeverity
                @Id INT, @Name NVARCHAR(50), @Label NVARCHAR(50),
                @TextColor NVARCHAR(50), @BgColor NVARCHAR(50), @DisplayOrder INT
            AS
            BEGIN
                SET NOCOUNT ON;
                UPDATE MasterSeverities SET Name=@Name, Label=@Label, TextColor=@TextColor,
                    BgColor=@BgColor, DisplayOrder=@DisplayOrder
                WHERE Id = @Id;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_ToggleMasterSeverityActive", """
            CREATE OR ALTER PROCEDURE sp_ToggleMasterSeverityActive
                @Id INT
            AS
            BEGIN
                SET NOCOUNT ON;
                UPDATE MasterSeverities SET IsActive = CASE WHEN IsActive = 1 THEN 0 ELSE 1 END WHERE Id = @Id;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_GetAllMasterProcesses", """
            CREATE OR ALTER PROCEDURE sp_GetAllMasterProcesses
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT Id, Name, Description, DisplayOrder, IsActive
                FROM MasterProcesses ORDER BY DisplayOrder;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_CreateMasterProcess", """
            CREATE OR ALTER PROCEDURE sp_CreateMasterProcess
                @Id NVARCHAR(10), @Name NVARCHAR(200),
                @Description NVARCHAR(500), @DisplayOrder INT
            AS
            BEGIN
                SET NOCOUNT ON;
                INSERT INTO MasterProcesses (Id, Name, Description, DisplayOrder, IsActive)
                VALUES (@Id, @Name, @Description, @DisplayOrder, 1);
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_UpdateMasterProcess", """
            CREATE OR ALTER PROCEDURE sp_UpdateMasterProcess
                @Id NVARCHAR(10), @Name NVARCHAR(200),
                @Description NVARCHAR(500), @DisplayOrder INT
            AS
            BEGIN
                SET NOCOUNT ON;
                UPDATE MasterProcesses SET Name=@Name, Description=@Description, DisplayOrder=@DisplayOrder
                WHERE Id = @Id;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_ToggleMasterProcessActive", """
            CREATE OR ALTER PROCEDURE sp_ToggleMasterProcessActive
                @Id NVARCHAR(10)
            AS
            BEGIN
                SET NOCOUNT ON;
                UPDATE MasterProcesses SET IsActive = CASE WHEN IsActive = 1 THEN 0 ELSE 1 END WHERE Id = @Id;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_GetAllMasterTasks", """
            CREATE OR ALTER PROCEDURE sp_GetAllMasterTasks
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT Id, Name, ProcessId, DisplayOrder, IsActive
                FROM MasterTasks ORDER BY DisplayOrder;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_CreateMasterTask", """
            CREATE OR ALTER PROCEDURE sp_CreateMasterTask
                @Id NVARCHAR(10), @Name NVARCHAR(200),
                @ProcessId NVARCHAR(10), @DisplayOrder INT
            AS
            BEGIN
                SET NOCOUNT ON;
                INSERT INTO MasterTasks (Id, Name, ProcessId, DisplayOrder, IsActive)
                VALUES (@Id, @Name, @ProcessId, @DisplayOrder, 1);
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_UpdateMasterTask", """
            CREATE OR ALTER PROCEDURE sp_UpdateMasterTask
                @Id NVARCHAR(10), @Name NVARCHAR(200),
                @ProcessId NVARCHAR(10), @DisplayOrder INT
            AS
            BEGIN
                SET NOCOUNT ON;
                UPDATE MasterTasks SET Name=@Name, ProcessId=@ProcessId, DisplayOrder=@DisplayOrder
                WHERE Id = @Id;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_ToggleMasterTaskActive", """
            CREATE OR ALTER PROCEDURE sp_ToggleMasterTaskActive
                @Id NVARCHAR(10)
            AS
            BEGIN
                SET NOCOUNT ON;
                UPDATE MasterTasks SET IsActive = CASE WHEN IsActive = 1 THEN 0 ELSE 1 END WHERE Id = @Id;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_GetAllMasterUsers", """
            CREATE OR ALTER PROCEDURE sp_GetAllMasterUsers
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT Id, Name, Email, DisplayOrder, IsActive
                FROM MasterUsers ORDER BY DisplayOrder;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_CreateMasterUser", """
            CREATE OR ALTER PROCEDURE sp_CreateMasterUser
                @Id NVARCHAR(10), @Name NVARCHAR(200),
                @Email NVARCHAR(300), @DisplayOrder INT
            AS
            BEGIN
                SET NOCOUNT ON;
                INSERT INTO MasterUsers (Id, Name, Email, DisplayOrder, IsActive)
                VALUES (@Id, @Name, @Email, @DisplayOrder, 1);
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_UpdateMasterUser", """
            CREATE OR ALTER PROCEDURE sp_UpdateMasterUser
                @Id NVARCHAR(10), @Name NVARCHAR(200),
                @Email NVARCHAR(300), @DisplayOrder INT
            AS
            BEGIN
                SET NOCOUNT ON;
                UPDATE MasterUsers SET Name=@Name, Email=@Email, DisplayOrder=@DisplayOrder
                WHERE Id = @Id;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_ToggleMasterUserActive", """
            CREATE OR ALTER PROCEDURE sp_ToggleMasterUserActive
                @Id NVARCHAR(10)
            AS
            BEGIN
                SET NOCOUNT ON;
                UPDATE MasterUsers SET IsActive = CASE WHEN IsActive = 1 THEN 0 ELSE 1 END WHERE Id = @Id;
            END
            """);

        // ── User Permissions SPs ──

        await CreateOrAlterProcAsync(connection, "sp_GetAllUserPermissions", """
            CREATE OR ALTER PROCEDURE sp_GetAllUserPermissions
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT p.Id, p.UserId, u.Name AS UserName, u.Email AS UserEmail,
                    p.CanCreateIssue, p.CanEditIssue, p.CanResolveIssue,
                    p.CanBulkUpload, p.CanAccessAdmin, p.IsBlocked
                FROM UserPermissions p
                INNER JOIN MasterUsers u ON p.UserId = u.Id
                ORDER BY u.DisplayOrder;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_GetUserPermissions", """
            CREATE OR ALTER PROCEDURE sp_GetUserPermissions
                @UserId NVARCHAR(10)
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT p.Id, p.UserId, u.Name AS UserName, u.Email AS UserEmail,
                    p.CanCreateIssue, p.CanEditIssue, p.CanResolveIssue,
                    p.CanBulkUpload, p.CanAccessAdmin, p.IsBlocked
                FROM UserPermissions p
                INNER JOIN MasterUsers u ON p.UserId = u.Id
                WHERE p.UserId = @UserId;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_UpsertUserPermissions", """
            CREATE OR ALTER PROCEDURE sp_UpsertUserPermissions
                @UserId NVARCHAR(10),
                @CanCreateIssue BIT, @CanEditIssue BIT, @CanResolveIssue BIT,
                @CanBulkUpload BIT, @CanAccessAdmin BIT, @IsBlocked BIT
            AS
            BEGIN
                SET NOCOUNT ON;
                IF EXISTS (SELECT 1 FROM UserPermissions WHERE UserId = @UserId)
                    UPDATE UserPermissions SET
                        CanCreateIssue=@CanCreateIssue, CanEditIssue=@CanEditIssue,
                        CanResolveIssue=@CanResolveIssue, CanBulkUpload=@CanBulkUpload,
                        CanAccessAdmin=@CanAccessAdmin, IsBlocked=@IsBlocked
                    WHERE UserId = @UserId;
                ELSE
                    INSERT INTO UserPermissions (UserId, CanCreateIssue, CanEditIssue, CanResolveIssue, CanBulkUpload, CanAccessAdmin, IsBlocked)
                    VALUES (@UserId, @CanCreateIssue, @CanEditIssue, @CanResolveIssue, @CanBulkUpload, @CanAccessAdmin, @IsBlocked);
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_GetUserById", """
            CREATE OR ALTER PROCEDURE sp_GetUserById
                @UserId NVARCHAR(10)
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT u.Id, u.Name, u.Email, u.IsActive,
                       ISNULL(p.CanCreateIssue, 0)  AS CanCreateIssue,
                       ISNULL(p.CanEditIssue, 0)    AS CanEditIssue,
                       ISNULL(p.CanResolveIssue, 0)  AS CanResolveIssue,
                       ISNULL(p.CanBulkUpload, 0)    AS CanBulkUpload,
                       ISNULL(p.CanAccessAdmin, 0)   AS CanAccessAdmin,
                       ISNULL(p.IsBlocked, 0)        AS IsBlocked
                FROM MasterUsers u
                LEFT JOIN UserPermissions p ON u.Id = p.UserId
                WHERE u.Id = @UserId AND u.IsActive = 1;
            END
            """);

        await CreateOrAlterProcAsync(connection, "sp_EnsureUser", """
            CREATE OR ALTER PROCEDURE sp_EnsureUser
                @UserId NVARCHAR(10),
                @Name   NVARCHAR(200),
                @Email  NVARCHAR(300)
            AS
            BEGIN
                SET NOCOUNT ON;
                -- Upsert MasterUsers
                IF NOT EXISTS (SELECT 1 FROM MasterUsers WHERE Id = @UserId)
                BEGIN
                    DECLARE @MaxOrder INT = ISNULL((SELECT MAX(DisplayOrder) FROM MasterUsers), -1);
                    INSERT INTO MasterUsers (Id, Name, Email, DisplayOrder, IsActive)
                    VALUES (@UserId, @Name, @Email, @MaxOrder + 1, 1);
                END
                ELSE
                    UPDATE MasterUsers SET Name = @Name, Email = @Email WHERE Id = @UserId;
                -- Insert default permissions if not exists
                IF NOT EXISTS (SELECT 1 FROM UserPermissions WHERE UserId = @UserId)
                    INSERT INTO UserPermissions (UserId, CanCreateIssue, CanEditIssue, CanResolveIssue, CanBulkUpload, CanAccessAdmin, IsBlocked)
                    VALUES (@UserId, 1, 1, 1, 1, 0, 0);
                -- Return combined result
                SELECT u.Id, u.Name, u.Email, u.IsActive,
                       p.CanCreateIssue, p.CanEditIssue, p.CanResolveIssue,
                       p.CanBulkUpload, p.CanAccessAdmin, p.IsBlocked
                FROM MasterUsers u
                INNER JOIN UserPermissions p ON p.UserId = u.Id
                WHERE u.Id = @UserId;
            END
            """);

        logger.LogInformation("Database schema and stored procedures initialized successfully.");
    }

    private async Task CreateDatabaseIfNotExistsAsync()
    {
        // Connect to master to create the target database
        var masterConnStr = connectionFactory.CreateConnection().ConnectionString
            .Replace("IssuesTracker", "master");

        using var masterConn = new Microsoft.Data.SqlClient.SqlConnection(masterConnStr);
        await masterConn.ExecuteAsync("""
            IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'IssuesTracker')
            CREATE DATABASE IssuesTracker;
            """);
    }

    private static async Task CreateOrAlterProcAsync(System.Data.IDbConnection connection, string name, string sql)
    {
        await connection.ExecuteAsync(sql);
    }
}
