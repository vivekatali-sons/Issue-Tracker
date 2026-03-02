using Dapper;

namespace DMS.API.Data;

public class SeedData(IDbConnectionFactory connectionFactory, ILogger<SeedData> logger)
{
    public async Task SeedAsync()
    {
        using var connection = connectionFactory.CreateConnection();

        // Only seed if table is empty
        var count = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Issues");
        if (count > 0)
        {
            logger.LogInformation("Database already seeded ({Count} issues found). Skipping.", count);
            return;
        }

        logger.LogInformation("Seeding database with sample data...");

        // ── Issue 1: Sales CRM ──
        var issue1Id = await connection.ExecuteScalarAsync<int>("""
            INSERT INTO Issues (ProcessId, TaskId, IssueDate, IssueRaisedBy, IssueTitle, IssueDescription, Status, Severity, AssignedTo, AssigningDate, DueDate, CurrentVersion, ReopenCount, CreatedAt, UpdatedAt)
            VALUES ('p1', 't1', '2026-02-01', 'u6', 'CRM Lead Conversion Failing', 'When converting a lead to opportunity, the system throws a validation error on the phone number field even when format is correct.', 'In Progress', 'High', 'u1', '2026-02-01', '2026-02-10', 1, 0, '2026-02-01T09:00:00', '2026-02-05T14:30:00');
            SELECT CAST(SCOPE_IDENTITY() AS INT);
            """);
        await connection.ExecuteAsync("INSERT INTO IssueDependentProcesses (IssueId, ProcessId) VALUES (@IssueId, @ProcessId)",
            new[] { new { IssueId = issue1Id, ProcessId = "p4" } });
        await connection.ExecuteAsync("""
            INSERT INTO IssueVersions (IssueId, VersionNumber, CreatedDate, AssignedTo, AssigningDate, DueDate, Status)
            VALUES (@IssueId, 1, '2026-02-01T09:00:00', 'u1', '2026-02-01', '2026-02-10', 'New')
            """, new { IssueId = issue1Id });

        // ── Issue 2: Aftersales Work Order ──
        var issue2Id = await connection.ExecuteScalarAsync<int>("""
            INSERT INTO Issues (ProcessId, TaskId, IssueDate, IssueRaisedBy, IssueTitle, IssueDescription, Status, Severity, AssignedTo, AssigningDate, DueDate, CurrentVersion, ReopenCount, CreatedAt, UpdatedAt)
            VALUES ('p2', 't8', '2026-02-03', 'u7', 'Work Order Parts List Not Syncing', 'Parts added to a work order in the service module are not syncing to the procurement system for ordering.', 'New', 'Critical', 'u2', '2026-02-03', '2026-02-07', 1, 0, '2026-02-03T11:15:00', '2026-02-03T11:15:00');
            SELECT CAST(SCOPE_IDENTITY() AS INT);
            """);
        await connection.ExecuteAsync("INSERT INTO IssueDependentProcesses (IssueId, ProcessId) VALUES (@IssueId, @ProcessId)",
            new[] {
                new { IssueId = issue2Id, ProcessId = "p1" },
                new { IssueId = issue2Id, ProcessId = "p3" },
            });
        await connection.ExecuteAsync("""
            INSERT INTO IssueVersions (IssueId, VersionNumber, CreatedDate, AssignedTo, AssigningDate, DueDate, Status)
            VALUES (@IssueId, 1, '2026-02-03T11:15:00', 'u2', '2026-02-03', '2026-02-07', 'New')
            """, new { IssueId = issue2Id });

        // ── Issue 3: Finance Oracle Setup ──
        var issue3Id = await connection.ExecuteScalarAsync<int>("""
            INSERT INTO Issues (ProcessId, TaskId, IssueDate, IssueRaisedBy, IssueTitle, IssueDescription, Status, Severity, AssignedTo, AssigningDate, DueDate, CurrentVersion, ReopenCount, CreatedAt, UpdatedAt)
            VALUES ('p4', 't19', '2026-02-05', 'u8', 'Oracle Chart of Accounts Mapping Incorrect', 'The GL account mapping between DMS and Oracle Finance has discrepancies in the revenue accounts. AR invoices post to wrong GL codes.', 'Testing', 'Medium', 'u5', '2026-02-05', '2026-02-15', 1, 0, '2026-02-05T08:30:00', '2026-02-12T16:00:00');
            SELECT CAST(SCOPE_IDENTITY() AS INT);
            """);
        await connection.ExecuteAsync("INSERT INTO IssueDependentProcesses (IssueId, ProcessId) VALUES (@IssueId, @ProcessId)",
            new[] { new { IssueId = issue3Id, ProcessId = "p1" } });
        await connection.ExecuteAsync("""
            INSERT INTO IssueVersions (IssueId, VersionNumber, CreatedDate, AssignedTo, AssigningDate, DueDate, Status)
            VALUES (@IssueId, 1, '2026-02-05T08:30:00', 'u5', '2026-02-05', '2026-02-15', 'New')
            """, new { IssueId = issue3Id });

        // ── Issue 4: Procurement (no dependent processes) ──
        var issue4Id = await connection.ExecuteScalarAsync<int>("""
            INSERT INTO Issues (ProcessId, TaskId, IssueDate, IssueRaisedBy, IssueTitle, IssueDescription, Status, Severity, AssignedTo, AssigningDate, DueDate, CurrentVersion, ReopenCount, CreatedAt, UpdatedAt)
            VALUES ('p3', 't15', '2026-02-08', 'u6', 'Car Procurement Approval Workflow Stuck', 'Purchase orders above AED 100K are not routing to the GM for approval. Stuck at department head level.', 'New', 'Low', 'u3', '2026-02-08', '2026-02-20', 1, 0, '2026-02-08T14:00:00', '2026-02-08T14:00:00');
            SELECT CAST(SCOPE_IDENTITY() AS INT);
            """);
        await connection.ExecuteAsync("""
            INSERT INTO IssueVersions (IssueId, VersionNumber, CreatedDate, AssignedTo, AssigningDate, DueDate, Status)
            VALUES (@IssueId, 1, '2026-02-08T14:00:00', 'u3', '2026-02-08', '2026-02-20', 'New')
            """, new { IssueId = issue4Id });

        // ── Issue 5: Resolved issue (Sales → Finance dep) ──
        var issue5Id = await connection.ExecuteScalarAsync<int>("""
            INSERT INTO Issues (ProcessId, TaskId, IssueDate, IssueRaisedBy, IssueTitle, IssueDescription, Status, Severity, AssignedTo, AssigningDate, DueDate, CurrentVersion, ReopenCount, CreatedAt, UpdatedAt)
            VALUES ('p1', 't3', '2026-01-20', 'u7', 'F&I Contract PDF Generation Error', 'Finance and Insurance contracts fail to generate PDF when customer has special characters in name (e.g., accented letters).', 'Resolved', 'High', 'u4', '2026-01-20', '2026-01-30', 1, 0, '2026-01-20T10:00:00', '2026-01-28T17:00:00');
            SELECT CAST(SCOPE_IDENTITY() AS INT);
            """);
        await connection.ExecuteAsync("INSERT INTO IssueDependentProcesses (IssueId, ProcessId) VALUES (@IssueId, @ProcessId)",
            new[] { new { IssueId = issue5Id, ProcessId = "p4" } });

        // Add resolution for issue 5
        var res5Id = await connection.ExecuteScalarAsync<int>("""
            INSERT INTO Resolutions (IssueId, VersionNumber, ResolvedDate, ResolvedBy, ResolutionNotes, RootCause, PreventiveMeasures, VerificationDate)
            VALUES (@IssueId, 1, '2026-01-28T17:00:00', 'u4', 'Updated PDF generation library to handle Unicode characters. Added encoding normalization step before PDF render.', 'PDF library was using ASCII encoding instead of UTF-8 for customer name fields.', 'Added unit tests for special character handling in all document generation. Updated encoding defaults in config.', '2026-01-29');
            SELECT CAST(SCOPE_IDENTITY() AS INT);
            """, new { IssueId = issue5Id });
        await connection.ExecuteAsync("INSERT INTO ResolutionTesters (ResolutionId, UserId) VALUES (@ResolutionId, @UserId)",
            new[] {
                new { ResolutionId = res5Id, UserId = "u6" },
                new { ResolutionId = res5Id, UserId = "u7" },
            });
        var depTest5Id = await connection.ExecuteScalarAsync<int>("""
            INSERT INTO DependentProcessTestResults (ResolutionId, ProcessId, Tested, TestDate)
            VALUES (@ResolutionId, 'p4', 1, '2026-01-29');
            SELECT CAST(SCOPE_IDENTITY() AS INT);
            """, new { ResolutionId = res5Id });
        await connection.ExecuteAsync("INSERT INTO TestResultTesters (TestResultId, UserId) VALUES (@TestResultId, @UserId)",
            new[] { new { TestResultId = depTest5Id, UserId = "u5" } });

        await connection.ExecuteAsync("""
            INSERT INTO IssueVersions (IssueId, VersionNumber, CreatedDate, AssignedTo, AssigningDate, DueDate, Status)
            VALUES (@IssueId, 1, '2026-01-20T10:00:00', 'u4', '2026-01-20', '2026-01-30', 'Resolved')
            """, new { IssueId = issue5Id });

        logger.LogInformation("Seeded {Count} sample issues.", 5);
    }

    public async Task SeedMasterDataAsync()
    {
        using var connection = connectionFactory.CreateConnection();

        logger.LogInformation("Seeding master data...");

        // ── Statuses ──
        await connection.ExecuteAsync("""
            IF NOT EXISTS (SELECT 1 FROM MasterStatuses WHERE Name = 'New')
            INSERT INTO MasterStatuses (Name, Label, TextColor, BgColor, ChartColor, DisplayOrder) VALUES ('New', 'New', 'text-blue-700', 'bg-blue-100', '#3b82f6', 0);
            IF NOT EXISTS (SELECT 1 FROM MasterStatuses WHERE Name = 'Open')
            INSERT INTO MasterStatuses (Name, Label, TextColor, BgColor, ChartColor, DisplayOrder) VALUES ('Open', 'Open', 'text-sky-700', 'bg-sky-100', '#0ea5e9', 1);
            IF NOT EXISTS (SELECT 1 FROM MasterStatuses WHERE Name = 'In Progress')
            INSERT INTO MasterStatuses (Name, Label, TextColor, BgColor, ChartColor, DisplayOrder) VALUES ('In Progress', 'In Progress', 'text-purple-700', 'bg-purple-100', '#8b5cf6', 2);
            IF NOT EXISTS (SELECT 1 FROM MasterStatuses WHERE Name = 'Testing')
            INSERT INTO MasterStatuses (Name, Label, TextColor, BgColor, ChartColor, DisplayOrder) VALUES ('Testing', 'Testing', 'text-yellow-700', 'bg-yellow-100', '#eab308', 3);
            IF NOT EXISTS (SELECT 1 FROM MasterStatuses WHERE Name = 'Resolved')
            INSERT INTO MasterStatuses (Name, Label, TextColor, BgColor, ChartColor, DisplayOrder) VALUES ('Resolved', 'Resolved', 'text-green-700', 'bg-green-100', '#22c55e', 4);
            IF NOT EXISTS (SELECT 1 FROM MasterStatuses WHERE Name = 'Closed')
            INSERT INTO MasterStatuses (Name, Label, TextColor, BgColor, ChartColor, DisplayOrder) VALUES ('Closed', 'Closed', 'text-gray-700', 'bg-gray-100', '#6b7280', 5);
            IF NOT EXISTS (SELECT 1 FROM MasterStatuses WHERE Name = 'Reopened')
            INSERT INTO MasterStatuses (Name, Label, TextColor, BgColor, ChartColor, DisplayOrder) VALUES ('Reopened', 'Reopened', 'text-red-700', 'bg-red-100', '#ef4444', 6);
            IF NOT EXISTS (SELECT 1 FROM MasterStatuses WHERE Name = 'Future Requirement')
            INSERT INTO MasterStatuses (Name, Label, TextColor, BgColor, ChartColor, DisplayOrder) VALUES ('Future Requirement', 'Future Requirement', 'text-indigo-700', 'bg-indigo-100', '#6366f1', 7);
            """);

        // ── Severities ──
        await connection.ExecuteAsync("""
            IF NOT EXISTS (SELECT 1 FROM MasterSeverities WHERE Name = 'Critical')
            INSERT INTO MasterSeverities (Name, Label, TextColor, BgColor, DisplayOrder) VALUES ('Critical', 'Critical', 'text-red-700', 'bg-red-100', 0);
            IF NOT EXISTS (SELECT 1 FROM MasterSeverities WHERE Name = 'High')
            INSERT INTO MasterSeverities (Name, Label, TextColor, BgColor, DisplayOrder) VALUES ('High', 'High', 'text-orange-700', 'bg-orange-100', 1);
            IF NOT EXISTS (SELECT 1 FROM MasterSeverities WHERE Name = 'Medium')
            INSERT INTO MasterSeverities (Name, Label, TextColor, BgColor, DisplayOrder) VALUES ('Medium', 'Medium', 'text-yellow-700', 'bg-yellow-100', 2);
            IF NOT EXISTS (SELECT 1 FROM MasterSeverities WHERE Name = 'Low')
            INSERT INTO MasterSeverities (Name, Label, TextColor, BgColor, DisplayOrder) VALUES ('Low', 'Low', 'text-green-700', 'bg-green-100', 3);
            IF NOT EXISTS (SELECT 1 FROM MasterSeverities WHERE Name = 'Non Critical')
            INSERT INTO MasterSeverities (Name, Label, TextColor, BgColor, DisplayOrder) VALUES ('Non Critical', 'Non Critical', 'text-slate-700', 'bg-slate-100', 4);
            """);

        // ── Processes ──
        await connection.ExecuteAsync("""
            IF NOT EXISTS (SELECT 1 FROM MasterProcesses WHERE Id = 'p1')
            INSERT INTO MasterProcesses (Id, Name, Description, DisplayOrder) VALUES ('p1', 'Sales Module', 'Car sales and CRM operations', 0);
            IF NOT EXISTS (SELECT 1 FROM MasterProcesses WHERE Id = 'p2')
            INSERT INTO MasterProcesses (Id, Name, Description, DisplayOrder) VALUES ('p2', 'Aftersales Module', 'Service and warranty management', 1);
            IF NOT EXISTS (SELECT 1 FROM MasterProcesses WHERE Id = 'p3')
            INSERT INTO MasterProcesses (Id, Name, Description, DisplayOrder) VALUES ('p3', 'Procurement Module', 'Vehicle and parts procurement', 2);
            IF NOT EXISTS (SELECT 1 FROM MasterProcesses WHERE Id = 'p4')
            INSERT INTO MasterProcesses (Id, Name, Description, DisplayOrder) VALUES ('p4', 'Finance Module', 'Financial integrations and accounting', 3);
            """);

        // ── Tasks ──
        await connection.ExecuteAsync("""
            IF NOT EXISTS (SELECT 1 FROM MasterTasks WHERE Id = 't1')
            INSERT INTO MasterTasks (Id, Name, ProcessId, DisplayOrder) VALUES ('t1', 'CRM', 'p1', 0);
            IF NOT EXISTS (SELECT 1 FROM MasterTasks WHERE Id = 't2')
            INSERT INTO MasterTasks (Id, Name, ProcessId, DisplayOrder) VALUES ('t2', 'Car Sales', 'p1', 1);
            IF NOT EXISTS (SELECT 1 FROM MasterTasks WHERE Id = 't3')
            INSERT INTO MasterTasks (Id, Name, ProcessId, DisplayOrder) VALUES ('t3', 'Finance and Insurance', 'p1', 2);
            IF NOT EXISTS (SELECT 1 FROM MasterTasks WHERE Id = 't7')
            INSERT INTO MasterTasks (Id, Name, ProcessId, DisplayOrder) VALUES ('t7', 'Reports and Dashboard', 'p1', 3);
            IF NOT EXISTS (SELECT 1 FROM MasterTasks WHERE Id = 't8')
            INSERT INTO MasterTasks (Id, Name, ProcessId, DisplayOrder) VALUES ('t8', 'Work Order', 'p2', 0);
            IF NOT EXISTS (SELECT 1 FROM MasterTasks WHERE Id = 't9')
            INSERT INTO MasterTasks (Id, Name, ProcessId, DisplayOrder) VALUES ('t9', 'Car Inspection', 'p2', 1);
            IF NOT EXISTS (SELECT 1 FROM MasterTasks WHERE Id = 't15')
            INSERT INTO MasterTasks (Id, Name, ProcessId, DisplayOrder) VALUES ('t15', 'Car Procurement', 'p3', 0);
            IF NOT EXISTS (SELECT 1 FROM MasterTasks WHERE Id = 't18')
            INSERT INTO MasterTasks (Id, Name, ProcessId, DisplayOrder) VALUES ('t18', 'Parts Procurement', 'p3', 1);
            IF NOT EXISTS (SELECT 1 FROM MasterTasks WHERE Id = 't19')
            INSERT INTO MasterTasks (Id, Name, ProcessId, DisplayOrder) VALUES ('t19', 'Oracle Finance Setup', 'p4', 0);
            IF NOT EXISTS (SELECT 1 FROM MasterTasks WHERE Id = 't21')
            INSERT INTO MasterTasks (Id, Name, ProcessId, DisplayOrder) VALUES ('t21', 'AR Invoice Integration', 'p4', 1);
            """);

        // ── Users ──
        await connection.ExecuteAsync("""
            IF NOT EXISTS (SELECT 1 FROM MasterUsers WHERE Id = 'u1')
            INSERT INTO MasterUsers (Id, Name, Email, DisplayOrder) VALUES ('u1', 'Int Web Resource 1', 'intwebres1@company.com', 0);
            IF NOT EXISTS (SELECT 1 FROM MasterUsers WHERE Id = 'u2')
            INSERT INTO MasterUsers (Id, Name, Email, DisplayOrder) VALUES ('u2', 'Int Web Resource 2', 'intwebres2@company.com', 1);
            IF NOT EXISTS (SELECT 1 FROM MasterUsers WHERE Id = 'u3')
            INSERT INTO MasterUsers (Id, Name, Email, DisplayOrder) VALUES ('u3', 'Int Web Resource 3', 'intwebres3@company.com', 2);
            IF NOT EXISTS (SELECT 1 FROM MasterUsers WHERE Id = 'u4')
            INSERT INTO MasterUsers (Id, Name, Email, DisplayOrder) VALUES ('u4', 'Ext Web Resource 1', 'extwebres1@company.com', 3);
            IF NOT EXISTS (SELECT 1 FROM MasterUsers WHERE Id = 'u5')
            INSERT INTO MasterUsers (Id, Name, Email, DisplayOrder) VALUES ('u5', 'Oracle Functional', 'oracle.functional@company.com', 4);
            IF NOT EXISTS (SELECT 1 FROM MasterUsers WHERE Id = 'u6')
            INSERT INTO MasterUsers (Id, Name, Email, DisplayOrder) VALUES ('u6', 'Sohail', 'sohail@company.com', 5);
            IF NOT EXISTS (SELECT 1 FROM MasterUsers WHERE Id = 'u7')
            INSERT INTO MasterUsers (Id, Name, Email, DisplayOrder) VALUES ('u7', 'Junaid', 'junaid@company.com', 6);
            IF NOT EXISTS (SELECT 1 FROM MasterUsers WHERE Id = 'u8')
            INSERT INTO MasterUsers (Id, Name, Email, DisplayOrder) VALUES ('u8', 'Syed', 'syed@company.com', 7);
            """);

        logger.LogInformation("Master data seeded successfully.");
    }

    public async Task SeedAdminAsync()
    {
        using var connection = connectionFactory.CreateConnection();

        // ── Default admin credentials ──
        var adminExists = await connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM AdminCredentials WHERE Username = 'admin'");
        if (adminExists == 0)
        {
            var hash = BCrypt.Net.BCrypt.HashPassword("Admin@123");
            await connection.ExecuteAsync(
                "INSERT INTO AdminCredentials (Username, PasswordHash) VALUES (@Username, @PasswordHash)",
                new { Username = "admin", PasswordHash = hash });
            logger.LogInformation("Default admin credentials seeded (admin / Admin@123).");
        }

        // ── Default user permissions (all existing users get standard permissions) ──
        await connection.ExecuteAsync("""
            INSERT INTO UserPermissions (UserId, CanCreateIssue, CanEditIssue, CanResolveIssue, CanBulkUpload, CanAccessAdmin, IsBlocked)
            SELECT u.Id, 1, 1, 1, 1, 0, 0
            FROM MasterUsers u
            WHERE NOT EXISTS (SELECT 1 FROM UserPermissions p WHERE p.UserId = u.Id);
            """);

        logger.LogInformation("User permissions seeded.");
    }
}
