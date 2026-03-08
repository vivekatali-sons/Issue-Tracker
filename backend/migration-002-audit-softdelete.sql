-- ============================================================
-- Migration 002: Audit Trail + Soft Delete
-- ============================================================
-- INCREMENTAL migration — safe to re-run (idempotent)
-- Does NOT drop or alter existing columns/tables destructively
--
-- Changes:
--   1. New table: AuditLog
--   2. Add soft-delete columns to Issues (IsDeleted, DeletedAt, DeletedBy)
--   3. Update sp_GetAllIssues to exclude soft-deleted
--   4. Update sp_GetIssueById to exclude soft-deleted
--   5. Update sp_DeleteIssue to soft-delete instead of hard-delete
--   6. New SP: sp_HardDeleteIssue (admin-only, keeps old hard-delete logic)
--   7. New SP: sp_InsertAuditLog
--   8. New SP: sp_GetAuditLogs (with optional filters)
--   9. New SP: sp_GetAuditLogsByIssue
--  10. Update sp_GetAdminDashboardStats to exclude soft-deleted
-- ============================================================

USE IssuesTracker;
GO

-- ============================================================
-- 1. AuditLog table
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AuditLog')
CREATE TABLE AuditLog (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    Action      NVARCHAR(50)   NOT NULL,  -- Created, Updated, Deleted, Resolved, Reopened, Restored
    EntityType  NVARCHAR(50)   NOT NULL,  -- Issue, MasterData, etc.
    EntityId    INT            NULL,       -- Issue ID or other entity ID
    UserId      NVARCHAR(100)  NOT NULL,  -- Who performed the action
    Details     NVARCHAR(MAX)  NULL,       -- JSON with change details
    IpAddress   NVARCHAR(50)   NULL,
    Timestamp   DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- Index for efficient lookups by entity
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AuditLog_EntityType_EntityId')
    CREATE NONCLUSTERED INDEX IX_AuditLog_EntityType_EntityId
    ON AuditLog (EntityType, EntityId)
    INCLUDE (Action, UserId, Timestamp);
GO

-- Index for lookups by user
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AuditLog_UserId')
    CREATE NONCLUSTERED INDEX IX_AuditLog_UserId
    ON AuditLog (UserId)
    INCLUDE (Action, EntityType, EntityId, Timestamp);
GO

-- Index for timestamp-based queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AuditLog_Timestamp')
    CREATE NONCLUSTERED INDEX IX_AuditLog_Timestamp
    ON AuditLog (Timestamp DESC)
    INCLUDE (Action, EntityType, EntityId, UserId);
GO

-- ============================================================
-- 2. Soft-delete columns on Issues
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('Issues') AND name = 'IsDeleted'
)
ALTER TABLE Issues ADD IsDeleted BIT NOT NULL DEFAULT 0;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('Issues') AND name = 'DeletedAt'
)
ALTER TABLE Issues ADD DeletedAt DATETIME2 NULL;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('Issues') AND name = 'DeletedBy'
)
ALTER TABLE Issues ADD DeletedBy NVARCHAR(100) NULL;
GO

-- ============================================================
-- 3. Updated sp_GetAllIssues — exclude soft-deleted
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GetAllIssues
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Issues WHERE IsDeleted = 0 ORDER BY CreatedAt DESC;
END
GO

-- ============================================================
-- 4. Updated sp_GetIssueById — exclude soft-deleted
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GetIssueById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Issues WHERE Id = @Id AND IsDeleted = 0;
END
GO

-- ============================================================
-- 5. Updated sp_DeleteIssue — soft delete
-- ============================================================
CREATE OR ALTER PROCEDURE sp_DeleteIssue
    @Id        INT,
    @DeletedBy NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Issues SET
        IsDeleted = 1,
        DeletedAt = SYSUTCDATETIME(),
        DeletedBy = @DeletedBy,
        UpdatedAt = SYSUTCDATETIME()
    WHERE Id = @Id AND IsDeleted = 0;
END
GO

-- ============================================================
-- 6. sp_HardDeleteIssue — keeps old cascade-delete logic (admin only)
-- ============================================================
CREATE OR ALTER PROCEDURE sp_HardDeleteIssue
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    DELETE trt FROM TestResultTesters trt
        INNER JOIN DependentProcessTestResults dptr ON trt.TestResultId = dptr.Id
        INNER JOIN Resolutions r ON dptr.ResolutionId = r.Id
        WHERE r.IssueId = @Id;
    DELETE trt FROM TestResultTesters trt
        INNER JOIN DependentProcessTestResults dptr ON trt.TestResultId = dptr.Id
        INNER JOIN IssueVersions v ON dptr.VersionId = v.Id
        WHERE v.IssueId = @Id;
    DELETE dptr FROM DependentProcessTestResults dptr
        INNER JOIN Resolutions r ON dptr.ResolutionId = r.Id
        WHERE r.IssueId = @Id;
    DELETE dptr FROM DependentProcessTestResults dptr
        INNER JOIN IssueVersions v ON dptr.VersionId = v.Id
        WHERE v.IssueId = @Id;
    DELETE rt FROM ResolutionTesters rt
        INNER JOIN Resolutions r ON rt.ResolutionId = r.Id
        WHERE r.IssueId = @Id;
    DELETE FROM Resolutions WHERE IssueId = @Id;
    DELETE FROM IssueVersions WHERE IssueId = @Id;
    DELETE FROM IssueDependentProcesses WHERE IssueId = @Id;
    DELETE FROM FileAttachments WHERE IssueId = @Id;
    DELETE FROM AuditLog WHERE EntityType = 'Issue' AND EntityId = @Id;
    DELETE FROM Issues WHERE Id = @Id;
    COMMIT TRANSACTION;
END
GO

-- ============================================================
-- 7. sp_RestoreIssue — undo soft delete
-- ============================================================
CREATE OR ALTER PROCEDURE sp_RestoreIssue
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Issues SET
        IsDeleted = 0,
        DeletedAt = NULL,
        DeletedBy = NULL,
        UpdatedAt = SYSUTCDATETIME()
    WHERE Id = @Id AND IsDeleted = 1;
END
GO

-- ============================================================
-- 8. sp_GetDeletedIssues — list soft-deleted issues (admin)
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GetDeletedIssues
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Issues WHERE IsDeleted = 1 ORDER BY DeletedAt DESC;
END
GO

-- ============================================================
-- 9. sp_InsertAuditLog
-- ============================================================
CREATE OR ALTER PROCEDURE sp_InsertAuditLog
    @Action     NVARCHAR(50),
    @EntityType NVARCHAR(50),
    @EntityId   INT = NULL,
    @UserId     NVARCHAR(100),
    @Details    NVARCHAR(MAX) = NULL,
    @IpAddress  NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO AuditLog (Action, EntityType, EntityId, UserId, Details, IpAddress, Timestamp)
    VALUES (@Action, @EntityType, @EntityId, @UserId, @Details, @IpAddress, SYSUTCDATETIME());
    SELECT CAST(SCOPE_IDENTITY() AS INT);
END
GO

-- ============================================================
-- 10. sp_GetAuditLogs — paginated with optional filters
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GetAuditLogs
    @EntityType NVARCHAR(50) = NULL,
    @EntityId   INT = NULL,
    @UserId     NVARCHAR(100) = NULL,
    @Action     NVARCHAR(50) = NULL,
    @PageSize   INT = 50,
    @Page       INT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        Id, Action, EntityType, EntityId, UserId, Details, IpAddress, Timestamp
    FROM AuditLog
    WHERE (@EntityType IS NULL OR EntityType = @EntityType)
      AND (@EntityId IS NULL OR EntityId = @EntityId)
      AND (@UserId IS NULL OR UserId = @UserId)
      AND (@Action IS NULL OR Action = @Action)
    ORDER BY Timestamp DESC
    OFFSET (@Page - 1) * @PageSize ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- ============================================================
-- 11. sp_GetAuditLogsByIssue — convenience SP
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GetAuditLogsByIssue
    @IssueId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Action, EntityType, EntityId, UserId, Details, IpAddress, Timestamp
    FROM AuditLog
    WHERE EntityType = 'Issue' AND EntityId = @IssueId
    ORDER BY Timestamp DESC;
END
GO

-- ============================================================
-- 12. Updated sp_GetAdminDashboardStats — exclude soft-deleted
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GetAdminDashboardStats
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        (SELECT COUNT(*) FROM MasterUsers) AS TotalUsers,
        (SELECT COUNT(*) FROM MasterUsers WHERE IsActive = 1) AS ActiveUsers,
        (SELECT COUNT(*) FROM UserPermissions WHERE IsBlocked = 1) AS BlockedUsers,
        (SELECT COUNT(*) FROM Issues WHERE IsDeleted = 0) AS TotalIssues,
        (SELECT COUNT(*) FROM Issues WHERE IsDeleted = 0 AND Status NOT IN ('Resolved', 'Closed')) AS OpenIssues,
        (SELECT COUNT(*) FROM Issues WHERE IsDeleted = 0 AND DueDate < SYSUTCDATETIME() AND Status NOT IN ('Resolved', 'Closed')) AS OverdueIssues,
        (SELECT COUNT(*) FROM Issues WHERE IsDeleted = 0 AND Status IN ('Resolved', 'Closed')) AS ResolvedIssues,
        (SELECT COUNT(*) FROM Issues WHERE IsDeleted = 0 AND Severity = 'Critical' AND Status NOT IN ('Resolved', 'Closed')) AS CriticalIssues,
        (SELECT COUNT(*) FROM MasterStatuses WHERE IsActive = 1) AS ActiveStatuses,
        (SELECT COUNT(*) FROM MasterSeverities WHERE IsActive = 1) AS ActiveSeverities,
        (SELECT COUNT(*) FROM MasterProcesses WHERE IsActive = 1) AS ActiveProcesses,
        (SELECT COUNT(*) FROM MasterTasks WHERE IsActive = 1) AS ActiveTasks,
        (SELECT COUNT(*) FROM Issues WHERE IsDeleted = 1) AS DeletedIssues;
END
GO

-- ============================================================
-- Migration 002 complete!
-- New table:  AuditLog
-- New columns: Issues.IsDeleted, Issues.DeletedAt, Issues.DeletedBy
-- New SPs: sp_InsertAuditLog, sp_GetAuditLogs, sp_GetAuditLogsByIssue,
--          sp_HardDeleteIssue, sp_RestoreIssue, sp_GetDeletedIssues
-- Updated SPs: sp_GetAllIssues, sp_GetIssueById, sp_DeleteIssue,
--              sp_GetAdminDashboardStats
-- ============================================================
PRINT 'Migration 002 (Audit Trail + Soft Delete) completed successfully.';
GO
