namespace DMS.API.Models;

public class MasterStatus
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Label { get; set; } = "";
    public string TextColor { get; set; } = "";
    public string BgColor { get; set; } = "";
    public string ChartColor { get; set; } = "";
    public int DisplayOrder { get; set; }
}

public class MasterSeverity
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Label { get; set; } = "";
    public string TextColor { get; set; } = "";
    public string BgColor { get; set; } = "";
    public int DisplayOrder { get; set; }
}

public class MasterProcess
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public int DisplayOrder { get; set; }
}

public class MasterTask
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string ProcessId { get; set; } = "";
    public int DisplayOrder { get; set; }
}

public class MasterUser
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public int DisplayOrder { get; set; }
}

public record MasterDataResponse(
    List<MasterStatus> Statuses,
    List<MasterSeverity> Severities,
    List<MasterProcess> Processes,
    List<MasterTask> Tasks,
    List<MasterUser> Users
);
