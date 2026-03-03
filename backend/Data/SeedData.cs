using Dapper;

namespace DMS.API.Data;

public class SeedData(IDbConnectionFactory connectionFactory, ILogger<SeedData> logger)
{
    public async Task SeedAsync()
    {
        // No-op: sample issue seeding removed per requirement.
        // Issues should be created via the UI or bulk upload only.
        await Task.CompletedTask;
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
            INSERT INTO MasterProcesses (Id, Name, Description, DisplayOrder) VALUES ('p2', 'Services Module', 'Service and warranty management', 1);
            IF NOT EXISTS (SELECT 1 FROM MasterProcesses WHERE Id = 'p3')
            INSERT INTO MasterProcesses (Id, Name, Description, DisplayOrder) VALUES ('p3', 'Procurement Module', 'Vehicle and parts procurement', 2);
            IF NOT EXISTS (SELECT 1 FROM MasterProcesses WHERE Id = 'p4')
            INSERT INTO MasterProcesses (Id, Name, Description, DisplayOrder) VALUES ('p4', 'Finance Module', 'Financial integrations and accounting', 3);
            IF NOT EXISTS (SELECT 1 FROM MasterProcesses WHERE Id = 'p5')
            INSERT INTO MasterProcesses (Id, Name, Description, DisplayOrder) VALUES ('p5', 'Logistics Module', 'Logistics and supply chain operations', 4);
            IF NOT EXISTS (SELECT 1 FROM MasterProcesses WHERE Id = 'p6')
            INSERT INTO MasterProcesses (Id, Name, Description, DisplayOrder) VALUES ('p6', 'Training and UAT', 'Training sessions and user acceptance testing', 5);
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
            IF NOT EXISTS (SELECT 1 FROM MasterTasks WHERE Id = 't10')
            INSERT INTO MasterTasks (Id, Name, ProcessId, DisplayOrder) VALUES ('t10', 'Parts Master', 'p2', 2);
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
